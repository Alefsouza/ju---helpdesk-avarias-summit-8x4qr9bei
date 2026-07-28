DO $$
BEGIN
  -- Fix SELECT and UPDATE for formularios_espelho_danos
  DROP POLICY IF EXISTS "formularios_espelho_danos_select" ON public.formularios_espelho_danos;
  CREATE POLICY "formularios_espelho_danos_select" ON public.formularios_espelho_danos
    FOR SELECT TO authenticated
    USING (
      (chamado_id IN (SELECT id FROM public.chamados WHERE (usuario_id = auth.uid()) OR (responsavel_id = auth.uid()))) 
      OR is_admin() 
      OR is_responsavel()
    );

  DROP POLICY IF EXISTS "formularios_espelho_danos_update" ON public.formularios_espelho_danos;
  CREATE POLICY "formularios_espelho_danos_update" ON public.formularios_espelho_danos
    FOR UPDATE TO authenticated
    USING (
      (chamado_id IN (SELECT id FROM public.chamados WHERE (responsavel_id = auth.uid()))) 
      OR is_admin() 
      OR is_responsavel()
    )
    WITH CHECK (
      (chamado_id IN (SELECT id FROM public.chamados WHERE (responsavel_id = auth.uid()))) 
      OR is_admin() 
      OR is_responsavel()
    );

  -- Fix SELECT and UPDATE for formularios_ido
  DROP POLICY IF EXISTS "formularios_ido_select" ON public.formularios_ido;
  CREATE POLICY "formularios_ido_select" ON public.formularios_ido
    FOR SELECT TO authenticated
    USING (
      (chamado_id IN (SELECT id FROM public.chamados WHERE (usuario_id = auth.uid()) OR (responsavel_id = auth.uid()))) 
      OR is_admin() 
      OR is_responsavel()
    );

  DROP POLICY IF EXISTS "formularios_ido_update" ON public.formularios_ido;
  CREATE POLICY "formularios_ido_update" ON public.formularios_ido
    FOR UPDATE TO authenticated
    USING (
      (chamado_id IN (SELECT id FROM public.chamados WHERE (responsavel_id = auth.uid()))) 
      OR is_admin() 
      OR is_responsavel()
    )
    WITH CHECK (
      (chamado_id IN (SELECT id FROM public.chamados WHERE (responsavel_id = auth.uid()))) 
      OR is_admin() 
      OR is_responsavel()
    );
END $$;
