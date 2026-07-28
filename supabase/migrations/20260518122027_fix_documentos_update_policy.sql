DO $$
BEGIN
  DROP POLICY IF EXISTS "documentos_update" ON public.documentos;

  CREATE POLICY "documentos_update" ON public.documentos
    FOR UPDATE TO authenticated
    USING (
      chamado_id IS NULL OR 
      (chamado_id IN ( SELECT id FROM public.chamados WHERE responsavel_id = auth.uid() OR usuario_id = auth.uid() )) OR 
      public.is_admin() OR 
      public.is_responsavel() OR 
      public.is_vistoriador()
    )
    WITH CHECK (
      chamado_id IS NULL OR 
      (chamado_id IN ( SELECT id FROM public.chamados WHERE responsavel_id = auth.uid() OR usuario_id = auth.uid() )) OR 
      public.is_admin() OR 
      public.is_responsavel() OR 
      public.is_vistoriador()
    );
END $$;
