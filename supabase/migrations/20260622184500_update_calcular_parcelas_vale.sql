CREATE OR REPLACE FUNCTION public.calcular_parcelas_vale(
  p_valor_base numeric,
  p_quantidade_parcelas integer,
  p_data_base date DEFAULT CURRENT_DATE
)
RETURNS TABLE(numero_parcela integer, valor_parcela numeric, data_referencia date)
AS $$
DECLARE
  v_valor_parcela NUMERIC;
  v_data_base DATE;
BEGIN
  IF p_quantidade_parcelas <= 0 THEN
    p_quantidade_parcelas := 1;
  END IF;

  v_data_base := date_trunc('month', COALESCE(p_data_base, CURRENT_DATE))::DATE;
  
  v_valor_parcela := ROUND((p_valor_base / p_quantidade_parcelas)::numeric, 2);

  FOR i IN 1..p_quantidade_parcelas LOOP
    numero_parcela := i;
    
    IF i = p_quantidade_parcelas THEN
      valor_parcela := p_valor_base - (v_valor_parcela * (p_quantidade_parcelas - 1));
    ELSE
      valor_parcela := v_valor_parcela;
    END IF;

    data_referencia := (v_data_base + ((i - 1) || ' months')::interval)::DATE;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
