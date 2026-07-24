-- ==========================================================
-- V44 — PAGO AUTOMÁTICO POR IMPORTE EXACTO + COMPROBANTE
-- Ejecutar completo en Supabase > SQL Editor
-- ==========================================================

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
  v_aprobado boolean := false;
  v_estado text := 'Pendiente de revisión';
begin
  select id
  into v_contribuyente_id
  from public.contribuyentes
  where dni_normalizado = v_dni
    and activo = true
    and codigo_hash = crypt(coalesce(p_codigo,''), codigo_hash)
  limit 1;

  if v_contribuyente_id is null then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Acceso inválido.'
    );
  end if;

  if nullif(trim(coalesce(p_comprobante_path,'')),'') is null
     or nullif(trim(coalesce(p_comprobante_nombre,'')),'') is null
     or coalesce(p_comprobante_size,0) <= 0 then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Falta de comprobante. El pago no puede registrarse.'
    );
  end if;

  if p_comprobante_mime not in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ) or p_comprobante_size > 8388608 then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Comprobante inválido.'
    );
  end if;

  if p_obligacion_id is not null then
    select *
    into v_obligacion
    from public.obligaciones
    where id = p_obligacion_id
      and contribuyente_id = v_contribuyente_id
    for update;

    if v_obligacion.id is null then
      return jsonb_build_object(
        'ok', false,
        'mensaje', 'La tasa no pertenece a esta cuenta.'
      );
    end if;

    -- Autoaprobación únicamente si:
    -- 1. existe obligación,
    -- 2. todavía no está pagada,
    -- 3. el monto informado coincide exactamente.
    if v_obligacion.estado <> 'Pagado'
       and round(coalesce(p_importe,0),2) = round(coalesce(v_obligacion.importe,0),2) then
      v_aprobado := true;
      v_estado := 'Aprobado';
    end if;
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
    v_estado
  )
  returning id into v_id;

  if v_aprobado then
    update public.obligaciones
    set estado = 'Pagado',
        updated_at = now()
    where id = v_obligacion.id
      and contribuyente_id = v_contribuyente_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'aprobado', v_aprobado,
    'estado', v_estado
  );
end;
$$;

notify pgrst, 'reload schema';
