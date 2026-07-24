-- ==========================================================
-- V31 — TRÁMITES PRIVADOS BETA
-- Ejecutar completo en Supabase > SQL Editor
-- Usar primero únicamente con datos ficticios de prueba.
-- ==========================================================

create extension if not exists pgcrypto;

-- Contribuyentes: el código se guarda cifrado con bcrypt.
create table if not exists public.contribuyentes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  dni_normalizado text not null unique,
  codigo_hash text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.obligaciones (
  id uuid primary key default gen_random_uuid(),
  contribuyente_id uuid not null references public.contribuyentes(id) on delete cascade,
  concepto text not null,
  periodo text not null,
  importe numeric(14,2) not null check (importe >= 0),
  vencimiento date,
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente','Pagado','Vencido')),
  referencia text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pagos_informados (
  id uuid primary key default gen_random_uuid(),
  contribuyente_id uuid not null references public.contribuyentes(id) on delete cascade,
  obligacion_id uuid references public.obligaciones(id) on delete set null,
  concepto text not null,
  importe numeric(14,2) not null check (importe >= 0),
  fecha_pago date not null,
  referencia text,
  comprobante_nombre text,
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente','Aprobado','Rechazado')),
  created_at timestamptz not null default now()
);

create table if not exists public.configuracion_pagos (
  id smallint primary key default 1 check (id = 1),
  titular text not null default 'Comuna de La Penca y Caraguatá',
  alias text,
  cbu text,
  whatsapp text not null default '5493498502213',
  updated_at timestamptz not null default now()
);

insert into public.configuracion_pagos (id,titular,alias,cbu,whatsapp)
values (1,'Comuna de La Penca y Caraguatá',null,null,'5493498502213')
on conflict (id) do nothing;

create table if not exists public.intentos_tramites (
  id bigint generated always as identity primary key,
  dispositivo text not null,
  exitoso boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_obligaciones_contribuyente
on public.obligaciones(contribuyente_id);

create index if not exists idx_pagos_contribuyente
on public.pagos_informados(contribuyente_id);

create index if not exists idx_intentos_dispositivo_fecha
on public.intentos_tramites(dispositivo, created_at desc);

alter table public.contribuyentes enable row level security;
alter table public.obligaciones enable row level security;
alter table public.pagos_informados enable row level security;
alter table public.configuracion_pagos enable row level security;
alter table public.intentos_tramites enable row level security;

-- Nadie anónimo puede consultar directamente estas tablas.
revoke all on public.contribuyentes from anon;
revoke all on public.obligaciones from anon;
revoke all on public.pagos_informados from anon;
revoke all on public.configuracion_pagos from anon;
revoke all on public.intentos_tramites from anon;

grant select, insert, update, delete on
  public.contribuyentes,
  public.obligaciones,
  public.pagos_informados,
  public.configuracion_pagos
to authenticated;

drop policy if exists "Admin gestiona contribuyentes" on public.contribuyentes;
create policy "Admin gestiona contribuyentes"
on public.contribuyentes for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

drop policy if exists "Admin gestiona obligaciones" on public.obligaciones;
create policy "Admin gestiona obligaciones"
on public.obligaciones for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

drop policy if exists "Admin gestiona pagos informados" on public.pagos_informados;
create policy "Admin gestiona pagos informados"
on public.pagos_informados for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

drop policy if exists "Admin gestiona configuracion pagos" on public.configuracion_pagos;
create policy "Admin gestiona configuracion pagos"
on public.configuracion_pagos for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

-- Crear contribuyente desde la administración.
create or replace function public.admin_crear_contribuyente_beta(
  p_nombre text,
  p_dni text,
  p_codigo text,
  p_activo boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_dni text := regexp_replace(coalesce(p_dni,''), '\D', '', 'g');
  v_id uuid;
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'gerocancian2@gmail.com' then
    raise exception 'No autorizado';
  end if;

  if length(trim(coalesce(p_nombre,''))) < 3
     or length(v_dni) < 7
     or length(coalesce(p_codigo,'')) < 6 then
    return jsonb_build_object('ok',false,'mensaje','Revisá nombre, DNI y código.');
  end if;

  insert into public.contribuyentes(nombre,dni_normalizado,codigo_hash,activo)
  values (
    trim(p_nombre),
    v_dni,
    crypt(p_codigo, gen_salt('bf', 10)),
    coalesce(p_activo,true)
  )
  returning id into v_id;

  return jsonb_build_object('ok',true,'id',v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok',false,'mensaje','Ese DNI ya está cargado.');
end;
$$;

-- Cambiar el código sin revelar el código anterior.
create or replace function public.admin_cambiar_codigo_contribuyente(
  p_contribuyente_id uuid,
  p_codigo text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'gerocancian2@gmail.com' then
    raise exception 'No autorizado';
  end if;

  if length(coalesce(p_codigo,'')) < 6 then
    return jsonb_build_object('ok',false);
  end if;

  update public.contribuyentes
  set codigo_hash = crypt(p_codigo, gen_salt('bf', 10)),
      updated_at = now()
  where id = p_contribuyente_id;

  return jsonb_build_object('ok',found);
end;
$$;

-- Consulta privada. Siempre devuelve el mismo error genérico.
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
    ) order by
      case when o.estado='Pagado' then 1 else 0 end,
      o.vencimiento nulls last,
      o.created_at desc
  ),'[]'::jsonb)
  into v_obligaciones
  from public.obligaciones o
  where o.contribuyente_id = v_contribuyente.id;

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
    'pagos',coalesce(v_config,'{}'::jsonb)
  );
end;
$$;

-- Registrar aviso de pago tras volver a validar DNI y código.
create or replace function public.informar_pago_beta(
  p_dni text,
  p_codigo text,
  p_dispositivo text,
  p_obligacion_id uuid,
  p_concepto text,
  p_importe numeric,
  p_fecha_pago date,
  p_referencia text default null,
  p_comprobante_nombre text default null
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
    return jsonb_build_object('ok',false);
  end if;

  if p_obligacion_id is not null and not exists (
    select 1 from public.obligaciones
    where id = p_obligacion_id
      and contribuyente_id = v_contribuyente_id
  ) then
    return jsonb_build_object('ok',false);
  end if;

  insert into public.pagos_informados(
    contribuyente_id,
    obligacion_id,
    concepto,
    importe,
    fecha_pago,
    referencia,
    comprobante_nombre
  )
  values (
    v_contribuyente_id,
    p_obligacion_id,
    left(trim(coalesce(p_concepto,'Pago comunal')),120),
    greatest(coalesce(p_importe,0),0),
    p_fecha_pago,
    nullif(left(trim(coalesce(p_referencia,'')),100),''),
    nullif(left(trim(coalesce(p_comprobante_nombre,'')),180),'')
  )
  returning id into v_id;

  return jsonb_build_object('ok',true,'id',v_id);
end;
$$;

revoke all on function public.admin_crear_contribuyente_beta(text,text,text,boolean) from public;
revoke all on function public.admin_cambiar_codigo_contribuyente(uuid,text) from public;
revoke all on function public.consultar_estado_cuenta_beta(text,text,text) from public;
revoke all on function public.informar_pago_beta(text,text,text,uuid,text,numeric,date,text,text) from public;

grant execute on function public.admin_crear_contribuyente_beta(text,text,text,boolean) to authenticated;
grant execute on function public.admin_cambiar_codigo_contribuyente(uuid,text) to authenticated;
grant execute on function public.consultar_estado_cuenta_beta(text,text,text) to anon, authenticated;
grant execute on function public.informar_pago_beta(text,text,text,uuid,text,numeric,date,text,text) to anon, authenticated;

-- Limpiar intentos viejos manualmente cuando sea necesario:
delete from public.intentos_tramites
where created_at < now() - interval '30 days';

notify pgrst, 'reload schema';
