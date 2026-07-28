CREATE OR REPLACE FUNCTION public.calcular_parcelas_vale(p_valor_base numeric, p_quantidade_parcelas integer)
RETURNS TABLE(numero_parcela integer, data_referencia date, valor_parcela numeric)
LANGUAGE plpgsql
AS $$
DECLARE
    v_valor_parcela numeric;
    i integer;
BEGIN
    IF p_quantidade_parcelas <= 0 THEN
        RETURN;
    END IF;

    v_valor_parcela := ROUND(p_valor_base / p_quantidade_parcelas, 2);

    FOR i IN 1..p_quantidade_parcelas LOOP
        numero_parcela := i;
        -- Starts in the current month (i - 1), instead of next month (i)
        data_referencia := (DATE_TRUNC('month', CURRENT_DATE) + ((i - 1) || ' months')::interval)::date;
        valor_parcela := v_valor_parcela;
        
        -- Adjust the last installment to account for rounding differences
        IF i = p_quantidade_parcelas THEN
            valor_parcela := p_valor_base - (v_valor_parcela * (p_quantidade_parcelas - 1));
        END IF;

        RETURN NEXT;
    END LOOP;
END;
$;
