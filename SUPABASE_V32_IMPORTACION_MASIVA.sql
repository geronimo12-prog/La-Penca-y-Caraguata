-- ==========================================================
-- V32 — IMPORTACIÓN MASIVA PARA DATOS DE HABITANTES
-- Ejecutar después del SQL de la V31.
-- ==========================================================

create or replace function public.admin_importar_contribuyentes_beta(
  p_filas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_fila jsonb;
  v_dni text;
  v_nombre text;
  v_codigo text;
  v_activo boolean;
  v_creados integer := 0;
  v_actualizados integer := 0;
  v_errores integer := 0;
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'gerocancian2@gmail.com' then
    raise exception 'No autorizado';
  end if;

  for v_fila in select * from jsonb_array_elements(coalesce(p_filas,'[]'::jsonb))
  loop
    begin
      v_dni := regexp_replace(coalesce(v_fila->>'dni',''), '\D', '', 'g');
      v_nombre := trim(coalesce(v_fila->>'nombre',''));
      v_codigo := coalesce(v_fila->>'codigo','');
      v_activo := lower(coalesce(v_fila->>'activo','true')) in ('true','1','si','sí','activo');

      if length(v_dni) < 7 or length(v_nombre) < 3 or length(v_codigo) < 6 then
        v_errores := v_errores + 1;
        continue;
      end if;

      if exists(select 1 from public.contribuyentes where dni_normalizado = v_dni) then
        update public.contribuyentes
        set nombre = v_nombre,
            codigo_hash = crypt(v_codigo, gen_salt('bf',10)),
            activo = v_activo,
            updated_at = now()
        where dni_normalizado = v_dni;
        v_actualizados := v_actualizados + 1;
      else
        insert into public.contribuyentes(nombre,dni_normalizado,codigo_hash,activo)
        values(v_nombre,v_dni,crypt(v_codigo,gen_salt('bf',10)),v_activo);
        v_creados := v_creados + 1;
      end if;
    exception when others then
      v_errores := v_errores + 1;
    end;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'creados',v_creados,
    'actualizados',v_actualizados,
    'errores',v_errores
  );
end;
$$;

create or replace function public.admin_importar_obligaciones_beta(
  p_filas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila jsonb;
  v_dni text;
  v_contribuyente_id uuid;
  v_estado text;
  v_importe numeric;
  v_vencimiento date;
  v_creados integer := 0;
  v_errores integer := 0;
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'gerocancian2@gmail.com' then
    raise exception 'No autorizado';
  end if;

  for v_fila in select * from jsonb_array_elements(coalesce(p_filas,'[]'::jsonb))
  loop
    begin
      v_dni := regexp_replace(coalesce(v_fila->>'dni',''), '\D', '', 'g');

      select id into v_contribuyente_id
      from public.contribuyentes
      where dni_normalizado = v_dni
      limit 1;

      if v_contribuyente_id is null then
        v_errores := v_errores + 1;
        continue;
      end if;

      v_importe := replace(replace(coalesce(v_fila->>'importe','0'),'.',''),',','.')::numeric;
      v_estado := initcap(lower(coalesce(v_fila->>'estado','Pendiente')));
      if v_estado not in ('Pendiente','Pagado','Vencido') then
        v_estado := 'Pendiente';
      end if;

      v_vencimiento := null;
      if nullif(trim(coalesce(v_fila->>'vencimiento','')),'') is not null then
        v_vencimiento := (v_fila->>'vencimiento')::date;
      end if;

      insert into public.obligaciones(
        contribuyente_id,
        concepto,
        periodo,
        importe,
        vencimiento,
        estado
      )
      values(
        v_contribuyente_id,
        left(trim(coalesce(v_fila->>'concepto','Otro')),120),
        left(trim(coalesce(v_fila->>'periodo','Sin período')),120),
        greatest(v_importe,0),
        v_vencimiento,
        v_estado
      );

      v_creados := v_creados + 1;
    exception when others then
      v_errores := v_errores + 1;
    end;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'creados',v_creados,
    'errores',v_errores
  );
end;
$$;

revoke all on function public.admin_importar_contribuyentes_beta(jsonb) from public;
revoke all on function public.admin_importar_obligaciones_beta(jsonb) from public;

grant execute on function public.admin_importar_contribuyentes_beta(jsonb) to authenticated;
grant execute on function public.admin_importar_obligaciones_beta(jsonb) to authenticated;

notify pgrst, 'reload schema';
