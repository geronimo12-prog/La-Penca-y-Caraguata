-- ==========================================================
-- V46 — MERCADO PAGO + TRANSFERENCIAS PENDIENTES + CONCILIACIÓN
-- Pegá todo en Supabase SQL Editor y ejecutá.
-- ==========================================================

create extension if not exists pgcrypto;

-- La foto/comprobante NO aprueba por sí sola.
create or replace function public.informar_pago_beta_v2(
  p_dni text,
  p_codigo text,
  p_dispositivo text,
  p_obligacion_id uuid,
  p_concepto text,
  p_importe numeric,
  p_fecha_pago date,
  p_referencia text,
  p_comprobante_path text,
  p_comprobante_nombre text,
  p_comprobante_mime text,
  p_comprobante_size bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_dni text := regexp_replace(coalesce(p_dni,''), '\D', '', 'g');
  v_contribuyente_id uuid;
  v_obligacion public.obligaciones%rowtype;
  v_id uuid;
begin
  select id into v_contribuyente_id
  from public.contribuyentes
  where dni_normalizado = v_dni
    and activo = true
    and codigo_hash = crypt(coalesce(p_codigo,''), codigo_hash)
  limit 1;

  if v_contribuyente_id is null then
    return jsonb_build_object('ok',false,'mensaje','Acceso inválido.');
  end if;

  select * into v_obligacion
  from public.obligaciones
  where id = p_obligacion_id
    and contribuyente_id = v_contribuyente_id
  limit 1;

  if v_obligacion.id is null then
    return jsonb_build_object('ok',false,'mensaje','La tasa no pertenece a esta cuenta.');
  end if;

  if nullif(trim(coalesce(p_comprobante_path,'')),'') is null
     or nullif(trim(coalesce(p_comprobante_nombre,'')),'') is null
     or coalesce(p_comprobante_size,0) <= 0 then
    return jsonb_build_object(
      'ok',false,
      'mensaje','Falta de comprobante. El aviso no fue registrado.'
    );
  end if;

  if p_comprobante_mime not in (
    'image/jpeg','image/png','image/webp','application/pdf'
  ) or p_comprobante_size > 8388608 then
    return jsonb_build_object('ok',false,'mensaje','Comprobante inválido.');
  end if;

  insert into public.pagos_informados(
    contribuyente_id, obligacion_id, concepto, importe, fecha_pago,
    referencia, comprobante_nombre, comprobante_path,
    comprobante_mime, comprobante_size, estado
  )
  values(
    v_contribuyente_id,
    v_obligacion.id,
    left(trim(coalesce(p_concepto,v_obligacion.concepto)),120),
    greatest(coalesce(p_importe,0),0),
    p_fecha_pago,
    nullif(left(trim(coalesce(p_referencia,'')),100),''),
    left(trim(p_comprobante_nombre),180),
    left(trim(p_comprobante_path),220),
    p_comprobante_mime,
    p_comprobante_size,
    'Pendiente de revisión'
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok',true,
    'id',v_id,
    'aprobado',false,
    'estado','Pendiente de acreditación'
  );
end;
$$;

-- Registro de pagos confirmados por Mercado Pago.
create table if not exists public.mercadopago_pagos (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null unique,
  preference_id text,
  obligacion_id uuid references public.obligaciones(id) on delete set null,
  contribuyente_id uuid references public.contribuyentes(id) on delete set null,
  external_reference text,
  status text,
  status_detail text,
  transaction_amount numeric(14,2),
  currency_id text,
  payer_email text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mercadopago_pagos enable row level security;

drop policy if exists "Admin lee pagos Mercado Pago" on public.mercadopago_pagos;
create policy "Admin lee pagos Mercado Pago"
on public.mercadopago_pagos
for select
to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

-- Edge Function usa esta RPC para validar DNI/código y obtener la deuda.
create or replace function public.preparar_pago_mercadopago_beta(
  p_dni text,
  p_codigo text,
  p_obligacion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_dni text := regexp_replace(coalesce(p_dni,''), '\D', '', 'g');
  v_persona public.contribuyentes%rowtype;
  v_obligacion public.obligaciones%rowtype;
begin
  select * into v_persona
  from public.contribuyentes
  where dni_normalizado = v_dni
    and activo = true
    and codigo_hash = crypt(coalesce(p_codigo,''), codigo_hash)
  limit 1;

  if v_persona.id is null then
    return jsonb_build_object('ok',false,'mensaje','Acceso inválido.');
  end if;

  select * into v_obligacion
  from public.obligaciones
  where id = p_obligacion_id
    and contribuyente_id = v_persona.id
    and estado <> 'Pagado'
  limit 1;

  if v_obligacion.id is null then
    return jsonb_build_object('ok',false,'mensaje','Deuda inexistente o ya pagada.');
  end if;

  return jsonb_build_object(
    'ok',true,
    'contribuyente_id',v_persona.id,
    'nombre',v_persona.nombre,
    'dni',v_persona.dni_normalizado,
    'obligacion_id',v_obligacion.id,
    'concepto',v_obligacion.concepto,
    'periodo',v_obligacion.periodo,
    'importe',v_obligacion.importe
  );
end;
$$;

revoke all on function public.preparar_pago_mercadopago_beta(text,text,uuid) from public;
grant execute on function public.preparar_pago_mercadopago_beta(text,text,uuid)
to service_role;

-- Aplicar pago auténtico confirmado por API de Mercado Pago.
create or replace function public.aplicar_pago_mercadopago_beta(
  p_payment_id text,
  p_preference_id text,
  p_external_reference text,
  p_status text,
  p_status_detail text,
  p_transaction_amount numeric,
  p_currency_id text,
  p_payer_email text,
  p_raw jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obligacion public.obligaciones%rowtype;
begin
  if p_status <> 'approved' then
    insert into public.mercadopago_pagos(
      payment_id, preference_id, external_reference, status, status_detail,
      transaction_amount, currency_id, payer_email, raw, updated_at
    )
    values(
      p_payment_id,p_preference_id,p_external_reference,p_status,p_status_detail,
      p_transaction_amount,p_currency_id,p_payer_email,coalesce(p_raw,'{}'::jsonb),now()
    )
    on conflict(payment_id) do update set
      status=excluded.status,
      status_detail=excluded.status_detail,
      raw=excluded.raw,
      updated_at=now();

    return jsonb_build_object('ok',true,'aprobado',false);
  end if;

  select * into v_obligacion
  from public.obligaciones
  where id::text = p_external_reference
  for update;

  if v_obligacion.id is null then
    return jsonb_build_object('ok',false,'mensaje','Referencia desconocida.');
  end if;

  if round(v_obligacion.importe,2) <> round(coalesce(p_transaction_amount,0),2)
     or coalesce(p_currency_id,'') <> 'ARS' then
    return jsonb_build_object('ok',false,'mensaje','El importe o la moneda no coinciden.');
  end if;

  insert into public.mercadopago_pagos(
    payment_id, preference_id, obligacion_id, contribuyente_id,
    external_reference, status, status_detail, transaction_amount,
    currency_id, payer_email, raw, updated_at
  )
  values(
    p_payment_id,p_preference_id,v_obligacion.id,v_obligacion.contribuyente_id,
    p_external_reference,p_status,p_status_detail,p_transaction_amount,
    p_currency_id,p_payer_email,coalesce(p_raw,'{}'::jsonb),now()
  )
  on conflict(payment_id) do update set
    status=excluded.status,
    status_detail=excluded.status_detail,
    raw=excluded.raw,
    updated_at=now();

  update public.obligaciones
  set estado='Pagado', updated_at=now()
  where id=v_obligacion.id;

  insert into public.pagos_informados(
    contribuyente_id, obligacion_id, concepto, importe, fecha_pago,
    referencia, comprobante_nombre, estado
  )
  select
    v_obligacion.contribuyente_id,
    v_obligacion.id,
    v_obligacion.concepto,
    p_transaction_amount,
    current_date,
    p_payment_id,
    'Mercado Pago · pago verificado por API',
    'Aprobado'
  where not exists (
    select 1 from public.pagos_informados
    where referencia = p_payment_id
  );

  return jsonb_build_object('ok',true,'aprobado',true);
end;
$$;

revoke all on function public.aplicar_pago_mercadopago_beta(
  text,text,text,text,text,numeric,text,text,jsonb
) from public;
grant execute on function public.aplicar_pago_mercadopago_beta(
  text,text,text,text,text,numeric,text,text,jsonb
) to service_role;

-- Conciliación de transferencias por movimientos bancarios.
create or replace function public.admin_conciliar_movimientos_beta(
  p_movimientos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov jsonb;
  v_pago public.pagos_informados%rowtype;
  v_count integer;
  v_aprobados integer := 0;
  v_sin integer := 0;
  v_ambiguos integer := 0;
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'gerocancian2@gmail.com' then
    raise exception 'No autorizado';
  end if;

  for v_mov in select value from jsonb_array_elements(coalesce(p_movimientos,'[]'::jsonb))
  loop
    select count(*) into v_count
    from public.pagos_informados p
    where p.estado = 'Pendiente de revisión'
      and round(p.importe,2) = round(coalesce((v_mov->>'importe')::numeric,0),2)
      and p.fecha_pago between (v_mov->>'fecha')::date - 2 and (v_mov->>'fecha')::date + 2
      and (
        nullif(trim(coalesce(p.referencia,'')),'') is null
        or lower(coalesce(v_mov->>'referencia','')) like '%' || lower(p.referencia) || '%'
        or lower(coalesce(v_mov->>'descripcion','')) like '%' || lower(p.referencia) || '%'
      );

    if v_count = 1 then
      select * into v_pago
      from public.pagos_informados p
      where p.estado = 'Pendiente de revisión'
        and round(p.importe,2) = round(coalesce((v_mov->>'importe')::numeric,0),2)
        and p.fecha_pago between (v_mov->>'fecha')::date - 2 and (v_mov->>'fecha')::date + 2
        and (
          nullif(trim(coalesce(p.referencia,'')),'') is null
          or lower(coalesce(v_mov->>'referencia','')) like '%' || lower(p.referencia) || '%'
          or lower(coalesce(v_mov->>'descripcion','')) like '%' || lower(p.referencia) || '%'
        )
      limit 1;

      update public.pagos_informados
      set estado='Aprobado'
      where id=v_pago.id;

      if v_pago.obligacion_id is not null then
        update public.obligaciones
        set estado='Pagado', updated_at=now()
        where id=v_pago.obligacion_id;
      end if;

      v_aprobados := v_aprobados + 1;
    elsif v_count = 0 then
      v_sin := v_sin + 1;
    else
      v_ambiguos := v_ambiguos + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'aprobados',v_aprobados,
    'sin_coincidencia',v_sin,
    'ambiguos',v_ambiguos
  );
end;
$$;

grant execute on function public.admin_conciliar_movimientos_beta(jsonb)
to authenticated;

notify pgrst, 'reload schema';
