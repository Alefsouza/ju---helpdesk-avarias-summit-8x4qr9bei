-- Atualiza a política de RLS para permitir que responsáveis e admins vejam todos os chamados
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    is_responsavel() OR 
    is_admin()
  );
