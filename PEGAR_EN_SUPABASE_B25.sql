
-- ==========================================================
-- B25 — REPARACIÓN COMPLETA DE SUPABASE
-- Pegá todo en Supabase > SQL Editor > New query > Run
-- ==========================================================

create extension if not exists pgcrypto;

-- Noticias
create table if not exists public.noticias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null default 'Otros',
  descripcion text not null,
  fecha date not null default current_date,
  imagen_url text,
  portada_url text,
  destacada boolean not null default false,
  publicada boolean not null default true,
  publicar_en timestamptz,
  eliminada boolean not null default false,
  eliminada_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.noticias
  add column if not exists publicar_en timestamptz,
  add column if not exists eliminada boolean not null default false,
  add column if not exists eliminada_en timestamptz;

-- Avisos
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

alter table public.avisos
  add column if not exists titulo text,
  add column if not exists categoria text,
  add column if not exists detalle text,
  add column if not exists fecha date,
  add column if not exists hora_desde time,
  add column if not exists hora_hasta time;

-- Agenda
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  fecha_inicio timestamptz not null,
  lugar text,
  publicado boolean not null default true,
  created_at timestamptz not null default now()
);

-- Documentos
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

-- Encuestas
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

-- Proveedores
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

-- Suscriptores
create table if not exists public.suscriptores (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.noticias enable row level security;
alter table public.avisos enable row level security;
alter table public.eventos enable row level security;
alter table public.documentos enable row level security;
alter table public.encuestas enable row level security;
alter table public.votos_encuesta enable row level security;
alter table public.proveedores enable row level security;
alter table public.suscriptores enable row level security;

-- Grants
grant select on public.noticias, public.avisos, public.eventos,
  public.documentos, public.encuestas to anon, authenticated;

grant insert on public.votos_encuesta, public.proveedores,
  public.suscriptores to anon, authenticated;

grant select, insert, update, delete on public.noticias,
  public.avisos, public.eventos, public.documentos,
  public.encuestas, public.votos_encuesta, public.proveedores,
  public.suscriptores to authenticated;

revoke insert, update, delete on public.noticias,
  public.avisos, public.eventos, public.documentos,
  public.encuestas from anon;

-- Borrar políticas actuales para recrearlas sin conflictos.
drop policy if exists "Lectura pública de noticias publicadas" on public.noticias;
drop policy if exists "Administrador autorizado crea noticias" on public.noticias;
drop policy if exists "Administrador autorizado modifica noticias" on public.noticias;
drop policy if exists "Administrador autorizado borra noticias" on public.noticias;

create policy "Lectura pública de noticias publicadas"
on public.noticias for select to anon, authenticated
using (
  (publicada = true and eliminada = false
    and (publicar_en is null or publicar_en <= now()))
  or lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

create policy "Administrador autorizado crea noticias"
on public.noticias for insert to authenticated
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

create policy "Administrador autorizado modifica noticias"
on public.noticias for update to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

create policy "Administrador autorizado borra noticias"
on public.noticias for delete to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

-- Avisos
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

-- Eventos
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

-- Documentos
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

-- Encuestas
drop policy if exists "Lectura pública encuestas" on public.encuestas;
drop policy if exists "Admin gestiona encuestas" on public.encuestas;
drop policy if exists "Votar encuestas" on public.votos_encuesta;
drop policy if exists "Admin gestiona votos_encuesta" on public.votos_encuesta;

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

create policy "Votar encuestas"
on public.votos_encuesta for insert to anon, authenticated
with check (true);

create policy "Admin gestiona votos_encuesta"
on public.votos_encuesta for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

-- Proveedores
drop policy if exists "Registrar proveedores" on public.proveedores;
drop policy if exists "Admin gestiona proveedores" on public.proveedores;

create policy "Registrar proveedores"
on public.proveedores for insert to anon, authenticated
with check (true);

create policy "Admin gestiona proveedores"
on public.proveedores for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

-- Suscriptores
drop policy if exists "Registrar suscriptores" on public.suscriptores;
drop policy if exists "Admin gestiona suscriptores" on public.suscriptores;

create policy "Registrar suscriptores"
on public.suscriptores for insert to anon, authenticated
with check (true);

create policy "Admin gestiona suscriptores"
on public.suscriptores for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com');

-- Bucket de noticias
insert into storage.buckets (id, name, public)
values ('noticias-imagenes', 'noticias-imagenes', true)
on conflict (id) do update set public = true;

drop policy if exists "Administrador autorizado sube imágenes" on storage.objects;
drop policy if exists "Administrador autorizado consulta imágenes" on storage.objects;
drop policy if exists "Administrador autorizado actualiza imágenes" on storage.objects;
drop policy if exists "Administrador autorizado borra imágenes" on storage.objects;

create policy "Administrador autorizado sube imágenes"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'noticias-imagenes'
  and lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

create policy "Administrador autorizado consulta imágenes"
on storage.objects for select to authenticated
using (
  bucket_id = 'noticias-imagenes'
  and lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

create policy "Administrador autorizado actualiza imágenes"
on storage.objects for update to authenticated
using (
  bucket_id = 'noticias-imagenes'
  and lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
)
with check (
  bucket_id = 'noticias-imagenes'
  and lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

create policy "Administrador autorizado borra imágenes"
on storage.objects for delete to authenticated
using (
  bucket_id = 'noticias-imagenes'
  and lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

-- Recargar caché de Supabase/PostgREST.
notify pgrst, 'reload schema';
