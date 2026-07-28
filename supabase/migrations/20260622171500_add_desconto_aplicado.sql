DO $$
BEGIN
  ALTER TABLE public.solicitacoes_parcelamento ADD COLUMN IF NOT EXISTS desconto_aplicado BOOLEAN DEFAULT false;
END $$;
