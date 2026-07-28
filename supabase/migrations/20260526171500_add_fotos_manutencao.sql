-- Make sure the column exists on the documentos table as per the requirements.
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS fotos_manutencao JSONB DEFAULT '[]'::jsonb;
