-- Update calcular_parcelas_vale to ensure data_referencia starts exactly from the 1st of the p_data_base month
CREATE OR REPLACE FUNCTION public.calcular_parcelas_vale(
  p_valor_base numeric,
  p_quantidade_parcelas integer,
  p_data_base date DEFAULT CURRENT_DATE
)
RETURNS TABLE(numero_parcela integer, data_referencia date, valor_parcela numeric)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_valor_parcela numeric;
  v_data_ref date;
  i integer;
BEGIN
  IF p_quantidade_parcelas <= 0 THEN
    RETURN;
  END IF;

  v_valor_parcela := TRUNC(p_valor_base / p_quantidade_parcelas, 2);
  v_data_ref := date_trunc('month', p_data_base)::date;

  FOR i IN 1..p_quantidade_parcelas LOOP
    numero_parcela := i;
    data_referencia := v_data_ref;
    
    IF i = p_quantidade_parcelas THEN
      valor_parcela := p_valor_base - (v_valor_parcela * (p_quantidade_parcelas - 1));
    ELSE
      valor_parcela := v_valor_parcela;
    END IF;

    RETURN NEXT;
    v_data_ref := (v_data_ref + interval '1 month')::date;
  END LOOP;
END;
$function$;
