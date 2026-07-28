DO $block$
BEGIN
  -- Ensure the prefixo column has a unique index to support idempotent upserts safely
  
  -- Clean up possible exact duplicates to prevent errors when enforcing uniqueness
  DELETE FROM public.frota_veiculos a
  USING public.frota_veiculos b
  WHERE a.id < b.id AND a.prefixo = b.prefixo;

  -- Drop existing constraint to safely enforce it as an explicit index
  ALTER TABLE public.frota_veiculos DROP CONSTRAINT IF EXISTS frota_veiculos_prefixo_key;
  
  -- Create unique index
  CREATE UNIQUE INDEX IF NOT EXISTS frota_veiculos_prefixo_key ON public.frota_veiculos(prefixo);
  
  -- Re-add the constraint mapping to the newly created index
  ALTER TABLE public.frota_veiculos ADD CONSTRAINT frota_veiculos_prefixo_key UNIQUE USING INDEX frota_veiculos_prefixo_key;

EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Index or Constraint already exists correctly, continuing safely.';
END $block$;
