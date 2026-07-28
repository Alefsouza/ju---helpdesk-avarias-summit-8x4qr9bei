DO $$
BEGIN
  -- Update the constraint on perfil_usuario
  ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_tipo_usuario_check;
  
  ALTER TABLE public.perfil_usuario ADD CONSTRAINT perfil_usuario_tipo_usuario_check 
  CHECK (tipo_usuario = ANY (ARRAY['basico', 'responsavel', 'admin', 'vistoriador', 'coc', 'sos', 'juridico', 'sinistro', 'secretaria_tecnica']));

END $$;

-- Add RLS for secretaria_tecnica on chamados
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid() OR
    responsavel_id = auth.uid() OR
    is_admin() OR
    is_responsavel() OR
    is_sos() OR
    is_coc() OR
    is_juridico() OR
    is_secretaria_tecnica() OR
    (is_sinistro() AND (
      (SELECT garagem FROM perfil_usuario WHERE id = auth.uid()) IS NOT NULL AND
      (SELECT garagem FROM perfil_usuario WHERE id = auth.uid()) = COALESCE(garagem, (SELECT garagem FROM perfil_usuario WHERE id = chamados.usuario_id))
    ))
  );

-- Add RLS for secretaria_tecnica on formularios_espelho_danos
DROP POLICY IF EXISTS "formularios_espelho_danos_select" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_select" ON public.formularios_espelho_danos
  FOR SELECT TO authenticated
  USING (
    (chamado_id IN (SELECT id FROM chamados WHERE usuario_id = auth.uid() OR responsavel_id = auth.uid())) OR
    is_admin() OR
    is_responsavel() OR
    is_sinistro() OR
    is_juridico() OR
    is_secretaria_tecnica()
  );
