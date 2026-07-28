DO $$
BEGIN
  ALTER TABLE public.anexos_chamado DROP CONSTRAINT IF EXISTS anexos_chamado_tipo_arquivo_check;
END $$;
