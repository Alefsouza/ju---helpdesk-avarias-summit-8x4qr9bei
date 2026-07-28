DO $$
BEGIN
  ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS aprovacoes_diretoria JSONB DEFAULT '[]'::jsonb;
END $$;
