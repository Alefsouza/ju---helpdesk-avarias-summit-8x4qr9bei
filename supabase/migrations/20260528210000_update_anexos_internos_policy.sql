-- Atualiza a política de INSERT para permitir que usuários do COC enviem anexos internos
DROP POLICY IF EXISTS "anexos_internos_insert" ON public.anexos_chamado_interno;

CREATE POLICY "anexos_internos_insert" ON public.anexos_chamado_interno
  FOR INSERT TO authenticated
  WITH CHECK (
    is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica() OR is_coc()
  );
