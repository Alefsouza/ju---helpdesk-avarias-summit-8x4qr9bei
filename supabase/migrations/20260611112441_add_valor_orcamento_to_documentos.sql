ALTER TABLE public.documentos
ADD COLUMN IF NOT EXISTS valor_orcamento NUMERIC(15, 2);
