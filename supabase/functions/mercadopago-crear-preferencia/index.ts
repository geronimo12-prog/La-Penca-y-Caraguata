import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://la-penca-y-caraguata.vercel.app";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { dni, codigo, obligacion_id } = await req.json();

    const validation = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/preparar_pago_mercadopago_beta`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_dni: dni,
          p_codigo: codigo,
          p_obligacion_id: obligacion_id,
        }),
      },
    );

    const debt = await validation.json();
    if (!validation.ok || !debt?.ok) {
      return Response.json(
        { error: debt?.mensaje || "No se pudo validar la deuda." },
        { status: 400, headers: cors },
      );
    }

    const preferenceResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          items: [{
            id: debt.obligacion_id,
            title: `${debt.concepto} · ${debt.periodo || "Comuna"}`,
            description: `Comuna de La Penca y Caraguatá · ${debt.nombre}`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: Number(debt.importe),
          }],
          payer: {
            name: debt.nombre,
            identification: { type: "DNI", number: debt.dni },
          },
          external_reference: debt.obligacion_id,
          notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
          back_urls: {
            success: `${SITE_URL}/?pago=aprobado`,
            pending: `${SITE_URL}/?pago=pendiente`,
            failure: `${SITE_URL}/?pago=fallido`,
          },
          auto_return: "approved",
          statement_descriptor: "COMUNA LA PENCA",
        }),
      },
    );

    const preference = await preferenceResponse.json();
    if (!preferenceResponse.ok) {
      return Response.json(
        { error: preference?.message || "Mercado Pago rechazó la preferencia." },
        { status: 502, headers: cors },
      );
    }

    return Response.json({
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    }, { headers: cors });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Error inesperado." },
      { status: 500, headers: cors },
    );
  }
});
