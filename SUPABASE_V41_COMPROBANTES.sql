-- ==========================================================
-- V41 — COMPROBANTES REALES, OBLIGATORIOS Y ORDENADOS
-- Ejecutar completo en Supabase > SQL Editor
-- ==========================================================

create extension if not exists pgcrypto;

alter table public.pagos_informados
  add column if not exists comprobante_path text,
  add column if not exists comprobante_mime text,
  add column if not exists comprobante_size bigint;

-- Ampliar estados permitidos sin perder registros.
alter table public.pagos_informados
  drop constraint if exists pagos_informados_estado_check;

alter table public.pagos_informados
  alter column estado set default 'Pendiente de revisión';

update public.pagos_informados
set estado = 'Pendiente de revisión'
where estado = 'Pendiente';

alter table public.pagos_informados
  add constraint pagos_informados_estado_check
  check (estado in ('Falta de comprobante','Pendiente de revisión','Aprobado','Rechazado'));

-- Bucket privado.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'comprobantes-pago',
  'comprobantes-pago',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'];

-- Subida pública únicamente; lectura solo para administración autenticada.
drop policy if exists "Ciudadanos suben comprobantes" on storage.objects;
drop policy if exists "Admin consulta comprobantes" on storage.objects;
drop policy if exists "Admin borra comprobantes" on storage.objects;

create policy "Ciudadanos suben comprobantes"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'comprobantes-pago'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','pdf')
);

create policy "Admin consulta comprobantes"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'comprobantes-pago'
  and lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

create policy "Admin borra comprobantes"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'comprobantes-pago'
  and lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

-- Reemplazar consulta para devolver también comprobantes.
create or replace function public.consultar_estado_cuenta_beta(
  p_dni text,
  p_codigo text,
  p_dispositivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_dni text := regexp_replace(coalesce(p_dni,''), '\D', '', 'g');
  v_contribuyente public.contribuyentes%rowtype;
  v_fallos integer;
  v_obligaciones jsonb;
  v_comprobantes jsonb;
  v_config jsonb;
begin
  select count(*) into v_fallos
  from public.intentos_tramites
  where dispositivo = left(coalesce(p_dispositivo,'sin-dispositivo'),120)
    and exitoso = false
    and created_at > now() - interval '10 minutes';

  if v_fallos >= 5 then
    return jsonb_build_object('ok',false);
  end if;

  select * into v_contribuyente
  from public.contribuyentes
  where dni_normalizado = v_dni
    and activo = true
    and codigo_hash = crypt(coalesce(p_codigo,''), codigo_hash)
  limit 1;

  if v_contribuyente.id is null then
    insert into public.intentos_tramites(dispositivo,exitoso)
    values (left(coalesce(p_dispositivo,'sin-dispositivo'),120),false);
    return jsonb_build_object('ok',false);
  end if;

  insert into public.intentos_tramites(dispositivo,exitoso)
  values (left(coalesce(p_dispositivo,'sin-dispositivo'),120),true);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',o.id,
      'concepto',o.concepto,
      'periodo',o.periodo,
      'importe',o.importe,
      'vencimiento',o.vencimiento,
      'estado',o.estado,
      'referencia',o.referencia
    )
    order by
      case when o.estado='Pagado' then 1 else 0 end,
      o.vencimiento nulls last,
      o.created_at desc
  ),'[]'::jsonb)
  into v_obligaciones
  from public.obligaciones o
  where o.contribuyente_id = v_contribuyente.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',p.id,
      'obligacion_id',p.obligacion_id,
      'concepto',p.concepto,
      'importe',p.importe,
      'fecha_pago',p.fecha_pago,
      'referencia',p.referencia,
      'comprobante_nombre',p.comprobante_nombre,
      'estado',p.estado,
      'created_at',p.created_at
    )
    order by p.created_at desc
  ),'[]'::jsonb)
  into v_comprobantes
  from public.pagos_informados p
  where p.contribuyente_id = v_contribuyente.id;

  select jsonb_build_object(
    'titular',c.titular,
    'alias',c.alias,
    'cbu',c.cbu,
    'whatsapp',c.whatsapp
  )
  into v_config
  from public.configuracion_pagos c
  where c.id = 1;

  return jsonb_build_object(
    'ok',true,
    'nombre',v_contribuyente.nombre,
    'obligaciones',v_obligaciones,
    'comprobantes',v_comprobantes,
    'pagos',coalesce(v_config,'{}'::jsonb)
  );
end;
$$;

-- Registrar pago solamente con comprobante real.
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

  if p_obligacion_id is not null and not exists (
    select 1 from public.obligaciones
    where id = p_obligacion_id
      and contribuyente_id = v_contribuyente_id
  ) then
    return jsonb_build_object('ok',false,'mensaje','La tasa no pertenece a esta cuenta.');
  end if;

  if nullif(trim(coalesce(p_comprobante_path,'')),'') is null
     or nullif(trim(coalesce(p_comprobante_nombre,'')),'') is null
     or coalesce(p_comprobante_size,0) <= 0 then
    return jsonb_build_object(
      'ok',false,
      'mensaje','Falta de comprobante. El pago no puede aprobarse.'
    );
  end if;

  if p_comprobante_mime not in (
    'image/jpeg','image/png','image/webp','application/pdf'
  ) or p_comprobante_size > 8388608 then
    return jsonb_build_object('ok',false,'mensaje','Comprobante inválido.');
  end if;

  insert into public.pagos_informados(
    contribuyente_id,
    obligacion_id,
    concepto,
    importe,
    fecha_pago,
    referencia,
    comprobante_nombre,
    comprobante_path,
    comprobante_mime,
    comprobante_size,
    estado
  )
  values(
    v_contribuyente_id,
    p_obligacion_id,
    left(trim(coalesce(p_concepto,'Pago comunal')),120),
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

  return jsonb_build_object('ok',true,'id',v_id);
end;
$$;

-- Aprobar pago: recién aquí la obligación pasa a Pagado.
create or replace function public.admin_resolver_pago_beta(
  p_pago_id uuid,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pago public.pagos_informados%rowtype;
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'gerocancian2@gmail.com' then
    raise exception 'No autorizado';
  end if;

  if p_estado not in ('Aprobado','Rechazado') then
    return jsonb_build_object('ok',false,'mensaje','Estado inválido.');
  end if;

  select * into v_pago
  from public.pagos_informados
  where id = p_pago_id
  for update;

  if v_pago.id is null then
    return jsonb_build_object('ok',false,'mensaje','Pago inexistente.');
  end if;

  if nullif(v_pago.comprobante_path,'') is null then
    update public.pagos_informados
    set estado = 'Falta de comprobante'
    where id = p_pago_id;

    return jsonb_build_object(
      'ok',false,
      'mensaje','No se puede aprobar: falta el comprobante.'
    );
  end if;

  update public.pagos_informados
  set estado = p_estado
  where id = p_pago_id;

  if p_estado = 'Aprobado' and v_pago.obligacion_id is not null then
    update public.obligaciones
    set estado = 'Pagado',
        updated_at = now()
    where id = v_pago.obligacion_id
      and contribuyente_id = v_pago.contribuyente_id;
  end if;

  return jsonb_build_object('ok',true);
end;
$$;

revoke all on function public.informar_pago_beta_v2(
  text,text,text,uuid,text,numeric,date,text,text,text,text,bigint
) from public;

revoke all on function public.admin_resolver_pago_beta(uuid,text) from public;

grant execute on function public.informar_pago_beta_v2(
  text,text,text,uuid,text,numeric,date,text,text,text,text,bigint
) to anon, authenticated;

grant execute on function public.admin_resolver_pago_beta(uuid,text)
to authenticated;

notify pgrst, 'reload schema';
