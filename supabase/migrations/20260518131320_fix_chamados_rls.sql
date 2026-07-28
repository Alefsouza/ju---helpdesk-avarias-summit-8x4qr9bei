-- Ajusta a política de RLS para permitir que os responsáveis reabram chamados finalizados
DROP POLICY IF EXISTS "chamados_update" ON public.chamados;

CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    (is_responsavel() AND ((responsavel_id = auth.uid()) OR (status = 'aberto'::text) OR (status = 'finalizado'::text))) OR 
    is_admin()
  );
