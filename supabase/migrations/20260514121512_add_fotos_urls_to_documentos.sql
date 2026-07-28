ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS fotos_urls JSONB DEFAULT '[]'::jsonb;
