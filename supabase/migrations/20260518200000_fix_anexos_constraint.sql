DO $$
BEGIN
  ALTER TABLE public.anexos_chamado DROP CONSTRAINT IF EXISTS anexos_chamado_tipo_arquivo_check;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE public.anexos_chamado_interno DROP CONSTRAINT IF EXISTS anexos_chamado_interno_tipo_arquivo_check;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;
