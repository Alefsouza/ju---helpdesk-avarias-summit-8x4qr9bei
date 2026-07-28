-- Function to check if user is sinistro
CREATE OR REPLACE FUNCTION public.is_sinistro()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'sinistro'
  );
END;
$function$;

DO $DO$
BEGIN
  -- Ensure the check constraint on perfil_usuario includes 'sinistro'
  ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_tipo_usuario_check;
  
  ALTER TABLE public.perfil_usuario ADD CONSTRAINT perfil_usuario_tipo_usuario_check 
    CHECK (tipo_usuario = ANY (ARRAY['basico'::text, 'responsavel'::text, 'admin'::text, 'vistoriador'::text, 'coc'::text, 'sos'::text, 'juridico'::text, 'sinistro'::text]));
END $DO$;

-- Update chamados RLS policies
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated
  USING ((usuario_id = auth.uid()) OR is_responsavel() OR is_sinistro() OR is_admin() OR is_sos() OR is_coc() OR is_juridico());

DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated
  USING ((usuario_id = auth.uid()) OR ((is_responsavel() OR is_sinistro() OR is_juridico()) AND ((responsavel_id = auth.uid()) OR (status = 'aberto'::text) OR (status = 'finalizado'::text))) OR is_admin() OR is_sos() OR is_coc());

-- Update documentos RLS policies
DROP POLICY IF EXISTS "documentos_delete" ON public.documentos;
CREATE POLICY "documentos_delete" ON public.documentos
  FOR DELETE TO authenticated
  USING (is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico());

DROP POLICY IF EXISTS "documentos_update" ON public.documentos;
CREATE POLICY "documentos_update" ON public.documentos
  FOR UPDATE TO authenticated
  USING ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_vistoriador() OR is_juridico())
  WITH CHECK ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_vistoriador() OR is_juridico());

-- Update anexos_chamado_interno RLS policies
DROP POLICY IF EXISTS "anexos_internos_delete" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_delete" ON public.anexos_chamado_interno
  FOR DELETE TO authenticated
  USING ((usuario_id = auth.uid()) AND (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico()));

DROP POLICY IF EXISTS "anexos_internos_insert" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_insert" ON public.anexos_chamado_interno
  FOR INSERT TO authenticated
  WITH CHECK (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico());

DROP POLICY IF EXISTS "anexos_internos_select" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_select" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (is_responsavel() OR is_sinistro() OR is_admin() OR is_sos() OR is_juridico());

DROP POLICY IF EXISTS "anexos_internos_update" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_update" ON public.anexos_chamado_interno
  FOR UPDATE TO authenticated
  USING ((usuario_id = auth.uid()) AND (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico()));

-- Update historico_chamado RLS policies
DROP POLICY IF EXISTS "Permitir SELECT para admin e responsáveis" ON public.historico_chamado;
CREATE POLICY "Permitir SELECT para admin e responsáveis" ON public.historico_chamado
  FOR SELECT TO authenticated
  USING (
    (( SELECT perfil_usuario.tipo_usuario FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = 'admin'::text) OR 
    (( SELECT perfil_usuario.tipo_usuario FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = 'responsavel'::text) OR 
    (( SELECT perfil_usuario.tipo_usuario FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = 'sinistro'::text) OR 
    (( SELECT perfil_usuario.tipo_usuario FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = 'juridico'::text) OR 
    (chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.usuario_id = auth.uid())))
  );

-- Update formularios_espelho_danos RLS policies
DROP POLICY IF EXISTS "formularios_espelho_danos_select" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_select" ON public.formularios_espelho_danos
  FOR SELECT TO authenticated
  USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.usuario_id = auth.uid()) OR (chamados.responsavel_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico());

DROP POLICY IF EXISTS "formularios_espelho_danos_update" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_update" ON public.formularios_espelho_danos
  FOR UPDATE TO authenticated
  USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico())
  WITH CHECK ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico());

-- Update formularios_ido RLS policies
DROP POLICY IF EXISTS "formularios_ido_select" ON public.formularios_ido;
CREATE POLICY "formularios_ido_select" ON public.formularios_ido
  FOR SELECT TO authenticated
  USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.usuario_id = auth.uid()) OR (chamados.responsavel_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico());

DROP POLICY IF EXISTS "formularios_ido_update" ON public.formularios_ido;
CREATE POLICY "formularios_ido_update" ON public.formularios_ido
  FOR UPDATE TO authenticated
  USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico())
  WITH CHECK ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico());
