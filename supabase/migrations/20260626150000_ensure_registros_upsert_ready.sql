DO $block$
BEGIN
  -- Double check unique constraint exists for UPSERT operations
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'registros_registro_key'
  ) THEN
    ALTER TABLE public.registros 
    ADD CONSTRAINT registros_registro_key UNIQUE (registro);
  END IF;

  -- Ensure proper basic indices are present to speed up regular and pattern autocomplete
  CREATE INDEX IF NOT EXISTS idx_registros_registro ON public.registros (registro);
END $block$;
