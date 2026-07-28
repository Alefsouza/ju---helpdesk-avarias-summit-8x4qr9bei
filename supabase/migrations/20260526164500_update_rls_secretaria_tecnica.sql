-- Ensure the function exists
CREATE OR REPLACE FUNCTION public.is_secretaria_tecnica()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'secretaria_tecnica'
  );
END;
$function$;

-- Update chamados select policy
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
    is_juridico() OR 
    is_secretaria_tecnica() OR 
    (is_sinistro() AND (
      (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()) IS NOT NULL AND 
      (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()) = COALESCE(garagem, (SELECT garagem FROM public.perfil_usuario WHERE id = public.chamados.usuario_id))
    ))
  );

-- Update formularios_espelho_danos select policy
DROP POLICY IF EXISTS "formularios_espelho_danos_select" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_select" ON public.formularios_espelho_danos
  FOR SELECT TO authenticated
  USING (
    (chamado_id IN (SELECT id FROM public.chamados WHERE usuario_id = auth.uid() OR responsavel_id = auth.uid())) OR 
    is_admin() OR 
    is_responsavel() OR 
    is_sinistro() OR 
    is_juridico() OR 
    is_secretaria_tecnica()
  );
