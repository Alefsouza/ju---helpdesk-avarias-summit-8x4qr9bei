DROP POLICY IF EXISTS "participantes_select" ON public.participantes_chamado;

CREATE POLICY "participantes_select" ON public.participantes_chamado
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid() OR 
    is_admin() OR 
    is_responsavel() OR 
    is_sinistro() OR 
    is_juridico()
  );
