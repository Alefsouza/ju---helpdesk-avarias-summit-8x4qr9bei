DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'registros_registro_key'
  ) THEN
    ALTER TABLE public.registros 
    ADD CONSTRAINT registros_registro_key UNIQUE (registro);
  END IF;
END $block$;
