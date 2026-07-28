DO $$
BEGIN
  -- Adiciona uma flag de controle para garantir a idempotencia da migração
  ALTER TABLE public.parcelas_vales ADD COLUMN IF NOT EXISTS is_data_referencia_fixed boolean DEFAULT false;

  -- Corrige os registros existentes avançando a data_referencia em 1 mês (removendo a lógica anterior de -1 mês)
  UPDATE public.parcelas_vales
  SET 
    data_referencia = (data_referencia::date + interval '1 month')::date,
    is_data_referencia_fixed = true
  WHERE is_data_referencia_fixed = false OR is_data_referencia_fixed IS NULL;
END $$;
