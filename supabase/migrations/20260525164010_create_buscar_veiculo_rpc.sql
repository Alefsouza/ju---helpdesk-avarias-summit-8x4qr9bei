CREATE OR REPLACE FUNCTION public.buscar_veiculo_por_placa(p_placa text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object('garagem', garagem, 'prefixo', prefixo) INTO v_result
  FROM public.frota_veiculos
  WHERE regexp_replace(placa, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || p_placa || '%'
  LIMIT 1;
  
  RETURN v_result;
END;
$$;
