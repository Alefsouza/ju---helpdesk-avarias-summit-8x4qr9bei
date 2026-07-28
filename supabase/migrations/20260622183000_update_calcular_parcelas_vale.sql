DROP FUNCTION IF EXISTS public.calcular_parcelas_vale(numeric, integer);

CREATE OR REPLACE FUNCTION public.calcular_parcelas_vale(
  p_valor_base numeric,
  p_quantidade_parcelas integer,
  p_data_base date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  numero_parcela integer,
  valor_parcela numeric,
  data_referencia date
) AS $$
DECLARE
  v_valor_parcela numeric;
BEGIN
  IF COALESCE(p_quantidade_parcelas, 0) <= 0 THEN
    RETURN;
  END IF;

  v_valor_parcela := ROUND(p_valor_base / p_quantidade_parcelas, 2);
  
  FOR i IN 1..p_quantidade_parcelas LOOP
    numero_parcela := i;
    valor_parcela := v_valor_parcela;
    -- Adding an interval of months handles month-end limits correctly in Postgres
    -- (e.g. '2024-01-31'::date + '1 month'::interval -> '2024-02-29')
    data_referencia := (p_data_base + ((i - 1) || ' months')::interval)::date;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
