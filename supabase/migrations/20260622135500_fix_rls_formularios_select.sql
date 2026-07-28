DO $$
BEGIN
  -- Safe SELECT policies to ensure driver info is accessible
  DROP POLICY IF EXISTS "permitir_select_formularios_espelho_aprovacao" ON public.formularios_espelho_danos;
  CREATE POLICY "permitir_select_formularios_espelho_aprovacao" ON public.formularios_espelho_danos
    FOR SELECT TO authenticated USING (true);
END $$;
