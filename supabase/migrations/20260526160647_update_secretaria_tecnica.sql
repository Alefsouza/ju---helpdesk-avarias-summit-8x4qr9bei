DO $$
BEGIN
  ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_tipo_usuario_check;
  ALTER TABLE public.perfil_usuario ADD CONSTRAINT perfil_usuario_tipo_usuario_check 
    CHECK (tipo_usuario = ANY (ARRAY['basico'::text, 'responsavel'::text, 'admin'::text, 'vistoriador'::text, 'coc'::text, 'sos'::text, 'juridico'::text, 'sinistro'::text, 'secretaria_tecnica'::text]));
END $$;

CREATE OR REPLACE FUNCTION public.is_secretaria_tecnica()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'secretaria_tecnica'
  );
END;
$;

DROP POLICY IF EXISTS "anexos_internos_select" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_select" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (is_responsavel() OR is_sinistro() OR is_admin() OR is_sos() OR is_juridico() OR is_secretaria_tecnica());

DROP POLICY IF EXISTS "anexos_internos_insert" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_insert" ON public.anexos_chamado_interno
  FOR INSERT TO authenticated
  WITH CHECK (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica());

DROP POLICY IF EXISTS "anexos_internos_update" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_update" ON public.anexos_chamado_interno
  FOR UPDATE TO authenticated
  USING ((usuario_id = auth.uid()) AND (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica()))
  WITH CHECK ((usuario_id = auth.uid()) AND (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica()));

DROP POLICY IF EXISTS "anexos_internos_delete" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_delete" ON public.anexos_chamado_interno
  FOR DELETE TO authenticated
  USING ((usuario_id = auth.uid()) AND (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica()));

DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated
  USING ((usuario_id = auth.uid()) OR (responsavel_id = auth.uid()) OR is_admin() OR is_responsavel() OR is_sos() OR is_coc() OR is_juridico() OR is_secretaria_tecnica() OR (is_sinistro() AND ((( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) IS NOT NULL) AND (( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id)))))));

DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated
  USING ((usuario_id = auth.uid()) OR (responsavel_id = auth.uid()) OR is_admin() OR is_sos() OR is_coc() OR is_secretaria_tecnica() OR (((status = 'aberto'::text) OR (status = 'finalizado'::text)) AND (is_responsavel() OR is_juridico() OR (is_sinistro() AND (( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id))))))))
  WITH CHECK ((usuario_id = auth.uid()) OR (responsavel_id = auth.uid()) OR is_admin() OR is_sos() OR is_coc() OR is_secretaria_tecnica() OR (((status = 'aberto'::text) OR (status = 'finalizado'::text)) AND (is_responsavel() OR is_juridico() OR (is_sinistro() AND (( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id))))))));

DROP POLICY IF EXISTS "documentos_update" ON public.documentos;
CREATE POLICY "documentos_update" ON public.documentos
  FOR UPDATE TO authenticated
  USING ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_vistoriador() OR is_juridico() OR is_secretaria_tecnica())
  WITH CHECK ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_vistoriador() OR is_juridico() OR is_secretaria_tecnica());

DROP POLICY IF EXISTS "formularios_espelho_danos_select" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_select" ON public.formularios_espelho_danos
  FOR SELECT TO authenticated
  USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.usuario_id = auth.uid()) OR (chamados.responsavel_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico() OR is_secretaria_tecnica());

DROP POLICY IF EXISTS "formularios_espelho_danos_update" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_update" ON public.formularios_espelho_danos
  FOR UPDATE TO authenticated
  USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico() OR is_secretaria_tecnica())
  WITH CHECK ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico() OR is_secretaria_tecnica());

DROP POLICY IF EXISTS "formularios_ido_select" ON public.formularios_ido;
CREATE POLICY "formularios_ido_select" ON public.formularios_ido
  FOR SELECT TO authenticated
  USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.usuario_id = auth.uid()) OR (chamados.responsavel_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico() OR is_secretaria_tecnica());

DROP POLICY IF EXISTS "formularios_ido_update" ON public.formularios_ido;
CREATE POLICY "formularios_ido_update" ON public.formularios_ido
  FOR UPDATE TO authenticated
  USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico() OR is_secretaria_tecnica())
  WITH CHECK ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico() OR is_secretaria_tecnica());
