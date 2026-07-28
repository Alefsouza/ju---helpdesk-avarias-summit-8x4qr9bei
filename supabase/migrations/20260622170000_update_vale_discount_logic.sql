-- Creates the database function for generating installment values with a mandatory 10% discount for Vales.
CREATE OR REPLACE FUNCTION public.calcular_parcelas_vale(
    p_valor_base NUMERIC,
    p_quantidade_parcelas INTEGER
) RETURNS TABLE (
    numero_parcela INTEGER,
    valor_parcela NUMERIC,
    data_referencia DATE
) AS $$
DECLARE
    v_valor_com_desconto NUMERIC;
    v_valor_por_parcela NUMERIC;
BEGIN
    -- Apply the 10% discount rule strictly as per DP requirements
    v_valor_com_desconto := p_valor_base * 0.90;
    
    IF p_quantidade_parcelas > 0 THEN
        v_valor_por_parcela := ROUND((v_valor_com_desconto / p_quantidade_parcelas)::numeric, 2);
    ELSE
        v_valor_por_parcela := v_valor_com_desconto;
        p_quantidade_parcelas := 1;
    END IF;

    FOR i IN 1..p_quantidade_parcelas LOOP
        numero_parcela := i;
        valor_parcela := v_valor_por_parcela;
        -- Start from next month
        data_referencia := date_trunc('month', current_date + (i || ' month')::interval)::date;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
