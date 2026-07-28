-- Update RLS policies for anexos_chamado_interno to allow secretaria_tecnica to manage budget attachments

DROP POLICY IF EXISTS "anexos_internos_insert" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_insert" ON public.anexos_chamado_interno
  FOR INSERT TO authenticated
  WITH CHECK (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica());

DROP POLICY IF EXISTS "anexos_internos_select" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_select" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (is_responsavel() OR is_sinistro() OR is_admin() OR is_sos() OR is_juridico() OR is_secretaria_tecnica());

DROP POLICY IF EXISTS "anexos_internos_update" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_update" ON public.anexos_chamado_interno
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() AND (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica()))
  WITH CHECK (usuario_id = auth.uid() AND (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica()));

DROP POLICY IF EXISTS "anexos_internos_delete" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_delete" ON public.anexos_chamado_interno
  FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() AND (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica()));
