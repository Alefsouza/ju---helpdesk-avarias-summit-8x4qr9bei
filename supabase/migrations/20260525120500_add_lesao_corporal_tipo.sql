DO $$
BEGIN
  -- Ensure column exists
  ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS tipo_chamado TEXT;
  
  -- The tipo_chamado column is historically TEXT without check constraints in this schema,
  -- so adding the new value "Lesão Corporal" is fully supported out of the box.
  -- This migration guarantees idempotency and structure readiness.
END $$;
