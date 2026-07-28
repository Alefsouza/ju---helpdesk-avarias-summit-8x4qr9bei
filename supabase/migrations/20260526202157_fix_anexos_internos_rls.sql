DROP POLICY IF EXISTS "anexos_internos_delete" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_delete" ON public.anexos_chamado_interno
  FOR DELETE TO authenticated
  USING (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica() OR usuario_id = auth.uid());

DROP POLICY IF EXISTS "anexos_internos_update" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_update" ON public.anexos_chamado_interno
  FOR UPDATE TO authenticated
  USING (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica() OR usuario_id = auth.uid())
  WITH CHECK (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica() OR usuario_id = auth.uid());
