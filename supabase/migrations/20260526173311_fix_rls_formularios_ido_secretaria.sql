-- Adiciona permissão de leitura para a Secretaria Técnica nos formulários IDO
DROP POLICY IF EXISTS "formularios_ido_select" ON public.formularios_ido;

CREATE POLICY "formularios_ido_select" ON public.formularios_ido
  FOR SELECT TO authenticated 
  USING (
    (chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.usuario_id = auth.uid()) OR (chamados.responsavel_id = auth.uid())))) 
    OR is_admin() 
    OR is_responsavel() 
    OR is_sinistro() 
    OR is_juridico()
    OR is_secretaria_tecnica()
  );
