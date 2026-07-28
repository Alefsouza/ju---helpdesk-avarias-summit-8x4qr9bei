DROP POLICY IF EXISTS "documentos_delete" ON public.documentos;
CREATE POLICY "documentos_delete" ON public.documentos
  FOR DELETE TO authenticated USING (is_admin() OR is_responsavel());
