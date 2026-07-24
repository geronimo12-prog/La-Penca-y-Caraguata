
-- V27 — CONFIGURACIÓN COMPLETA PARA SUPABASE

create extension if not exists pgcrypto;

create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text,
  categoria text,
  mensaje text not null,
  detalle text,
  fecha date,
  hora_desde time,
  hora_hasta time,
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
alter table public.encuestas enable row level security;
alter table public.votos_encuesta enable row level security;
alter table public.proveedores enable row level security;
alter table public.suscriptores enable row level security;

grant select on public.avisos, public.eventos, public.documentos, public.encuestas
to anon, authenticated;

grant insert on public.votos_encuesta, public.proveedores, public.suscriptores
to anon, authenticated;

grant select, insert, update, delete on
public.avisos, public.eventos, public.documentos, public.encuestas,
public.votos_encuesta, public.proveedores, public.suscriptores
to authenticated;

revoke insert, update, delete on
public.avisos, public.eventos, public.documentos, public.encuestas
from anon;

drop policy if exists "Lectura pública avisos" on public.avisos;
drop policy if exists "Admin gestiona avisos" on public.avisos;
create policy "Lectura pública avisos"
on public.avisos for select to anon, authenticated
using (
  activo = true
  or lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);
create policy "Admin gestiona avisos"
on public.avisos for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

drop policy if exists "Lectura pública eventos" on public.eventos;
drop policy if exists "Admin gestiona eventos" on public.eventos;
create policy "Lectura pública eventos"
on public.eventos for select to anon, authenticated
using (
  publicado = true
  or lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);
create policy "Admin gestiona eventos"
on public.eventos for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

drop policy if exists "Lectura pública documentos" on public.documentos;
drop policy if exists "Admin gestiona documentos" on public.documentos;
create policy "Lectura pública documentos"
on public.documentos for select to anon, authenticated
using (
  publicado = true
  or lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);
create policy "Admin gestiona documentos"
on public.documentos for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

drop policy if exists "Lectura pública encuestas" on public.encuestas;
drop policy if exists "Admin gestiona encuestas" on public.encuestas;
create policy "Lectura pública encuestas"
on public.encuestas for select to anon, authenticated
using (
  activa = true
  or lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);
create policy "Admin gestiona encuestas"
on public.encuestas for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

drop policy if exists "Votar encuestas" on public.votos_encuesta;
drop policy if exists "Admin gestiona votos_encuesta" on public.votos_encuesta;
create policy "Votar encuestas"
on public.votos_encuesta for insert to anon, authenticated
with check (true);
create policy "Admin gestiona votos_encuesta"
on public.votos_encuesta for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

drop policy if exists "Registrar proveedores" on public.proveedores;
drop policy if exists "Admin gestiona proveedores" on public.proveedores;
create policy "Registrar proveedores"
on public.proveedores for insert to anon, authenticated
with check (true);
create policy "Admin gestiona proveedores"
on public.proveedores for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

drop policy if exists "Registrar suscriptores" on public.suscriptores;
drop policy if exists "Admin gestiona suscriptores" on public.suscriptores;
create policy "Registrar suscriptores"
on public.suscriptores for insert to anon, authenticated
with check (true);
create policy "Admin gestiona suscriptores"
on public.suscriptores for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

notify pgrst, 'reload schema';
