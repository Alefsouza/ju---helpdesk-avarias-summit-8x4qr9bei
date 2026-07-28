CREATE OR REPLACE FUNCTION public.calcular_parcelas_vale(
  p_valor_base numeric,
  p_quantidade_parcelas integer,
  p_data_base date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  numero_parcela integer,
  valor_parcela numeric,
  data_referencia date
) AS $function$
DECLARE
  v_valor_parcela numeric;
BEGIN
  v_valor_parcela := round(p_valor_base / p_quantidade_parcelas, 2);
  
  FOR i IN 1..p_quantidade_parcelas LOOP
    numero_parcela := i;
    
    IF i = p_quantidade_parcelas THEN
      valor_parcela := p_valor_base - (v_valor_parcela * (p_quantidade_parcelas - 1));
    ELSE
      valor_parcela := v_valor_parcela;
    END IF;
    
    -- The first payment is always scheduled for the month the ticket is approved (p_data_base)
    -- Subsequent payments in the following months
    data_referencia := date_trunc('month', p_data_base) + ((i - 1) || ' month')::interval;
    
    RETURN NEXT;
  END LOOP;
END;
$function$ LANGUAGE plpgsql;
