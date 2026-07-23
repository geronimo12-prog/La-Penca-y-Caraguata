
-- ==========================================================
-- B21 — Estructura completa del portal ciudadano
-- Ejecutar UNA VEZ en Supabase > SQL Editor
-- ==========================================================

alter table public.noticias
  add column if not exists publicar_en timestamptz,
  add column if not exists eliminada boolean not null default false,
  add column if not exists eliminada_en timestamptz;

create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  mensaje text not null,
  tipo text not null default 'info',
  prioridad integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  fecha_inicio timestamptz not null,
  lugar text,
  publicado boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text,
  descripcion text,
  fecha date not null default current_date,
  url text,
  es_transparencia boolean not null default false,
  publicado boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.oportunidades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'Empleo',
  descripcion text,
  contacto text,
  publicado boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.encuestas (
  id uuid primary key default gen_random_uuid(),
  pregunta text not null,
  opciones jsonb not null default '[]'::jsonb,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.votos_encuesta (
  id uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references public.encuestas(id) on delete cascade,
  opcion integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cuit text not null,
  rubro text not null,
  telefono text not null,
  email text not null,
  localidad text,
  detalle text,
  estado text not null default 'Recibido',
  created_at timestamptz not null default now()
);

create table if not exists public.suscriptores (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.avisos enable row level security;
alter table public.eventos enable row level security;
alter table public.documentos enable row level security;
alter table public.oportunidades enable row level security;
alter table public.encuestas enable row level security;
alter table public.votos_encuesta enable row level security;
alter table public.proveedores enable row level security;
alter table public.suscriptores enable row level security;

grant select on public.avisos, public.eventos, public.documentos, public.oportunidades, public.encuestas to anon, authenticated;
grant insert on public.votos_encuesta, public.proveedores, public.suscriptores to anon, authenticated;
grant select, insert, update, delete on public.avisos, public.eventos, public.documentos, public.oportunidades, public.encuestas, public.votos_encuesta, public.proveedores, public.suscriptores to authenticated;

do $$
declare t text;
begin
  foreach t in array array['avisos','eventos','documentos','oportunidades','encuestas'] loop
    execute format('drop policy if exists "Lectura pública %s" on public.%I', t, t);
    execute format('create policy "Lectura pública %s" on public.%I for select to anon, authenticated using (true)', t, t);
  end loop;
end $$;

drop policy if exists "Votar encuestas" on public.votos_encuesta;
create policy "Votar encuestas" on public.votos_encuesta for insert to anon, authenticated with check (true);

drop policy if exists "Registrar proveedores" on public.proveedores;
create policy "Registrar proveedores" on public.proveedores for insert to anon, authenticated with check (true);

drop policy if exists "Registrar suscriptores" on public.suscriptores;
create policy "Registrar suscriptores" on public.suscriptores for insert to anon, authenticated with check (true);

do $$
declare t text;
begin
  foreach t in array array['avisos','eventos','documentos','oportunidades','encuestas','votos_encuesta','proveedores','suscriptores'] loop
    execute format('drop policy if exists "Admin gestiona %s" on public.%I', t, t);
    execute format(
      'create policy "Admin gestiona %s" on public.%I for all to authenticated using (lower(auth.jwt() ->> ''email'') = ''gerocancian2@gmail.com'') with check (lower(auth.jwt() ->> ''email'') = ''gerocancian2@gmail.com'')',
      t,t
    );
  end loop;
end $$;

-- Mantener noticias seguras y visibles solo si no están en papelera.
drop policy if exists "Lectura pública de noticias publicadas" on public.noticias;
create policy "Lectura pública de noticias publicadas"
on public.noticias for select to anon, authenticated
using (
  eliminada = false
  and (
    publicada = true
    or lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
  )
);

-- Publicación programada automática cuando alguien consulta la base.
create or replace function public.publicar_noticias_programadas()
returns void language sql security definer set search_path=public as $$
  update public.noticias
  set publicada=true, publicar_en=null, updated_at=now()
  where eliminada=false and publicada=false and publicar_en is not null and publicar_en <= now();
$$;

grant execute on function public.publicar_noticias_programadas() to anon, authenticated;
