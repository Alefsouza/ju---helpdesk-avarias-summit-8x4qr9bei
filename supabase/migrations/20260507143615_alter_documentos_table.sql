ALTER TABLE public.documentos
  DROP COLUMN IF EXISTS cargo_responsavel,
  ADD COLUMN IF NOT EXISTS registro_motorista TEXT,
  ADD COLUMN IF NOT EXISTS nome_motorista TEXT,
  ADD COLUMN IF NOT EXISTS numero_os TEXT;
