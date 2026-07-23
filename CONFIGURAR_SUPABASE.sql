-- B20: acceso real con Supabase Auth
-- Ejecutar en SQL Editor.

grant select on table public.noticias to anon, authenticated;
grant insert, update, delete on table public.noticias to authenticated;

revoke insert, update, delete on table public.noticias from anon;

drop policy if exists "Permitir crear noticias desde el panel" on public.noticias;
drop policy if exists "Permitir modificar noticias desde el panel" on public.noticias;
drop policy if exists "Permitir borrar noticias desde el panel" on public.noticias;

drop policy if exists "Administrador autorizado crea noticias" on public.noticias;
drop policy if exists "Administrador autorizado modifica noticias" on public.noticias;
drop policy if exists "Administrador autorizado borra noticias" on public.noticias;

create policy "Administrador autorizado crea noticias"
on public.noticias
for insert
to authenticated
with check (
  lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

create policy "Administrador autorizado modifica noticias"
on public.noticias
for update
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
)
with check (
  lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

create policy "Administrador autorizado borra noticias"
on public.noticias
for delete
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

drop policy if exists "Permitir subir imágenes desde el panel" on storage.objects;
drop policy if exists "Permitir actualizar imágenes desde el panel" on storage.objects;
drop policy if exists "Permitir borrar imágenes desde el panel" on storage.objects;

drop policy if exists "Administrador autorizado sube imágenes" on storage.objects;
drop policy if exists "Administrador autorizado actualiza imágenes" on storage.objects;
drop policy if exists "Administrador autorizado borra imágenes" on storage.objects;

create policy "Administrador autorizado sube imágenes"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'noticias-imagenes'
  and lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

create policy "Administrador autorizado actualiza imágenes"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'noticias-imagenes'
  and lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
)
with check (
  bucket_id = 'noticias-imagenes'
  and lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);

create policy "Administrador autorizado borra imágenes"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'noticias-imagenes'
  and lower(auth.jwt() ->> 'email') = 'gerocancian2@gmail.com'
);
