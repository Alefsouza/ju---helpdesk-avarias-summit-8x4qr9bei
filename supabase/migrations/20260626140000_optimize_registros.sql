DO $block$
BEGIN
  -- Add specific indexes for faster prefix search and bulk operations
  CREATE INDEX IF NOT EXISTS idx_registros_registro_pattern 
    ON public.registros (registro text_pattern_ops);
    
  -- Ensure RLS policies exist to allow bulk upserts by authenticated users if needed
  -- (Edge functions with service_role already bypass RLS, but this fulfills the AC)
  DROP POLICY IF EXISTS "registros_insert_policy" ON public.registros;
  CREATE POLICY "registros_insert_policy" ON public.registros
    FOR INSERT TO authenticated WITH CHECK (true);

  DROP POLICY IF EXISTS "registros_update_policy" ON public.registros;
  CREATE POLICY "registros_update_policy" ON public.registros
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
END $block$;
