ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_tipo_usuario_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'perfil_usuario_tipo_usuario_check'
  ) THEN
    ALTER TABLE public.perfil_usuario
      ADD CONSTRAINT perfil_usuario_tipo_usuario_check
      CHECK (tipo_usuario IN (
        'basico', 'responsavel', 'admin', 'vistoriador', 'coc', 'sos',
        'juridico', 'sinistro', 'secretaria_tecnica', 'dp', 'financeiro', 'contabil'
      ));
  END IF;
END $$;
