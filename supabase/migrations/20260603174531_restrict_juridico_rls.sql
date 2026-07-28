-- Restringir visibilidade para o perfil Jurídico para ver apenas chamados atribuídos ou que participa

DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    (responsavel_id = auth.uid()) OR 
    is_admin() OR 
    is_responsavel() OR 
    is_sos() OR 
    is_coc() OR 
    is_secretaria_tecnica() OR 
    (is_vistoriador() AND (garagem = ( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())))) OR 
    (is_sinistro() AND ((( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) IS NOT NULL) AND (( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id)))))) OR 
    (id IN ( SELECT participantes_chamado.chamado_id FROM participantes_chamado WHERE (participantes_chamado.usuario_id = auth.uid())))
  );

DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    (responsavel_id = auth.uid()) OR 
    is_admin() OR 
    is_sos() OR 
    is_coc() OR 
    (((status = 'aberto'::text) OR (status = 'finalizado'::text)) AND (is_responsavel() OR (is_sinistro() AND (( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id))))))) OR 
    (id IN ( SELECT participantes_chamado.chamado_id FROM participantes_chamado WHERE (participantes_chamado.usuario_id = auth.uid())))
  )
  WITH CHECK (
    (usuario_id = auth.uid()) OR 
    (responsavel_id = auth.uid()) OR 
    is_admin() OR 
    is_sos() OR 
    is_coc() OR 
    (((status = 'aberto'::text) OR (status = 'finalizado'::text)) AND (is_responsavel() OR (is_sinistro() AND (( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id))))))) OR 
    (id IN ( SELECT participantes_chamado.chamado_id FROM participantes_chamado WHERE (participantes_chamado.usuario_id = auth.uid())))
  );
