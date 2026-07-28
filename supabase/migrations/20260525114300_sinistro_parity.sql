-- Ensure is_sinistro function exists and is correct
CREATE OR REPLACE FUNCTION public.is_sinistro()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'sinistro'
  );
END;
$$;

-- Update chamados select policy
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    is_responsavel() OR 
    is_sinistro() OR 
    is_admin() OR 
    is_sos() OR 
    is_coc() OR 
    is_juridico()
  );

-- Update chamados update policy
DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    ((is_responsavel() OR is_sinistro() OR is_juridico()) AND ((responsavel_id = auth.uid()) OR (status = 'aberto') OR (status = 'finalizado'))) OR 
    is_admin() OR 
    is_sos() OR 
    is_coc()
  )
  WITH CHECK (
    (usuario_id = auth.uid()) OR 
    ((is_responsavel() OR is_sinistro() OR is_juridico()) AND ((responsavel_id = auth.uid()) OR (status = 'aberto') OR (status = 'finalizado'))) OR 
    is_admin() OR 
    is_sos() OR 
    is_coc()
  );

-- Update anexos_chamado_interno select policy
DROP POLICY IF EXISTS "anexos_internos_select" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_select" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (is_responsavel() OR is_sinistro() OR is_admin() OR is_sos() OR is_juridico());

-- Update anexos_chamado_interno insert policy
DROP POLICY IF EXISTS "anexos_internos_insert" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_insert" ON public.anexos_chamado_interno
  FOR INSERT TO authenticated
  WITH CHECK (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico());

-- Update anexos_chamado_interno update policy
DROP POLICY IF EXISTS "anexos_internos_update" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_update" ON public.anexos_chamado_interno
  FOR UPDATE TO authenticated
  USING ((usuario_id = auth.uid()) AND (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico()))
  WITH CHECK ((usuario_id = auth.uid()) AND (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico()));

-- Update anexos_chamado_interno delete policy
DROP POLICY IF EXISTS "anexos_internos_delete" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_delete" ON public.anexos_chamado_interno
  FOR DELETE TO authenticated
  USING ((usuario_id = auth.uid()) AND (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico()));

-- Update historico_chamado select policy
DROP POLICY IF EXISTS "Permitir SELECT para admin e responsáveis" ON public.historico_chamado;
CREATE POLICY "Permitir SELECT para admin e responsáveis" ON public.historico_chamado
  FOR SELECT TO authenticated
  USING (
    ((SELECT perfil_usuario.tipo_usuario FROM public.perfil_usuario WHERE perfil_usuario.id = auth.uid()) IN ('admin', 'responsavel', 'sinistro', 'juridico')) OR 
    (chamado_id IN (SELECT chamados.id FROM public.chamados WHERE chamados.usuario_id = auth.uid()))
  );

-- Update historico_chamado insert policy
DROP POLICY IF EXISTS "Permitir INSERT para responsáveis e admin" ON public.historico_chamado;
CREATE POLICY "Permitir INSERT para responsáveis e admin" ON public.historico_chamado
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update documentos update policy
DROP POLICY IF EXISTS "documentos_update" ON public.documentos;
CREATE POLICY "documentos_update" ON public.documentos
  FOR UPDATE TO authenticated
  USING (
    (chamado_id IS NULL) OR 
    (chamado_id IN (SELECT chamados.id FROM public.chamados WHERE chamados.responsavel_id = auth.uid() OR chamados.usuario_id = auth.uid())) OR 
    is_admin() OR is_responsavel() OR is_sinistro() OR is_vistoriador() OR is_juridico()
  )
  WITH CHECK (
    (chamado_id IS NULL) OR 
    (chamado_id IN (SELECT chamados.id FROM public.chamados WHERE chamados.responsavel_id = auth.uid() OR chamados.usuario_id = auth.uid())) OR 
    is_admin() OR is_responsavel() OR is_sinistro() OR is_vistoriador() OR is_juridico()
  );

-- Update documentos delete policy
DROP POLICY IF EXISTS "documentos_delete" ON public.documentos;
CREATE POLICY "documentos_delete" ON public.documentos
  FOR DELETE TO authenticated
  USING (is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico());

-- Update formularios_ido select policy
DROP POLICY IF EXISTS "formularios_ido_select" ON public.formularios_ido;
CREATE POLICY "formularios_ido_select" ON public.formularios_ido
  FOR SELECT TO authenticated
  USING (
    (chamado_id IN (SELECT chamados.id FROM public.chamados WHERE chamados.usuario_id = auth.uid() OR chamados.responsavel_id = auth.uid())) OR 
    is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico()
  );

-- Update formularios_ido update policy
DROP POLICY IF EXISTS "formularios_ido_update" ON public.formularios_ido;
CREATE POLICY "formularios_ido_update" ON public.formularios_ido
  FOR UPDATE TO authenticated
  USING (
    (chamado_id IN (SELECT chamados.id FROM public.chamados WHERE chamados.responsavel_id = auth.uid())) OR 
    is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico()
  )
  WITH CHECK (
    (chamado_id IN (SELECT chamados.id FROM public.chamados WHERE chamados.responsavel_id = auth.uid())) OR 
    is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico()
  );

-- Update formularios_espelho_danos select policy
DROP POLICY IF EXISTS "formularios_espelho_danos_select" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_select" ON public.formularios_espelho_danos
  FOR SELECT TO authenticated
  USING (
    (chamado_id IN (SELECT chamados.id FROM public.chamados WHERE chamados.usuario_id = auth.uid() OR chamados.responsavel_id = auth.uid())) OR 
    is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico()
  );

-- Update formularios_espelho_danos update policy
DROP POLICY IF EXISTS "formularios_espelho_danos_update" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_update" ON public.formularios_espelho_danos
  FOR UPDATE TO authenticated
  USING (
    (chamado_id IN (SELECT chamados.id FROM public.chamados WHERE chamados.responsavel_id = auth.uid())) OR 
    is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico()
  )
  WITH CHECK (
    (chamado_id IN (SELECT chamados.id FROM public.chamados WHERE chamados.responsavel_id = auth.uid())) OR 
    is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico()
  );
