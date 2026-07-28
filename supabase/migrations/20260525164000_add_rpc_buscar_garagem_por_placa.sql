CREATE OR REPLACE FUNCTION public.buscar_garagem_por_placa(p_placa text)
RETURNS text AS $$
DECLARE
  v_garagem text;
BEGIN
  SELECT garagem INTO v_garagem
  FROM public.frota_veiculos
  WHERE regexp_replace(placa, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || p_placa || '%'
  LIMIT 1;
  
  RETURN v_garagem;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
