import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET")!;

const encoder = new TextEncoder();

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function hmacHex(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const dataId = String(url.searchParams.get("data.id") || body?.data?.id || "").toLowerCase();
    const xSignature = req.headers.get("x-signature") || "";
    const requestId = req.headers.get("x-request-id") || "";

    const values = Object.fromEntries(
      xSignature.split(",").map((part) => part.trim().split("=", 2)),
    );
    const ts = values.ts || "";
    const received = values.v1 || "";

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const calculated = await hmacHex(MP_WEBHOOK_SECRET, manifest);

    if (!received || !timingSafeEqualHex(calculated, received)) {
      return new Response("invalid signature", { status: 401 });
    }

    if ((body?.type || url.searchParams.get("type")) !== "payment" || !dataId) {
      return new Response("ok", { status: 200 });
    }

    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${dataId}`,
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } },
    );
    const payment = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return new Response("payment lookup failed", { status: 502 });
    }

    const applyResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/aplicar_pago_mercadopago_beta`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_payment_id: String(payment.id),
          p_preference_id: payment.preference_id ? String(payment.preference_id) : null,
          p_external_reference: payment.external_reference || "",
          p_status: payment.status || "",
          p_status_detail: payment.status_detail || "",
          p_transaction_amount: Number(payment.transaction_amount || 0),
          p_currency_id: payment.currency_id || "",
          p_payer_email: payment.payer?.email || "",
          p_raw: payment,
        }),
      },
    );

    if (!applyResponse.ok) {
      return new Response("database update failed", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch {
    return new Response("error", { status: 500 });
  }
});
