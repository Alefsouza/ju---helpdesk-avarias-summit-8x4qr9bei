DO $$
BEGIN
  ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS nome_motorista text;
END $$;
