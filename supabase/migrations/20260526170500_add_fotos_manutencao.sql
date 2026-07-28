ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS fotos_manutencao JSONB DEFAULT '[]'::jsonb;
