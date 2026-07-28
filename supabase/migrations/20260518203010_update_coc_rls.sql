CREATE OR REPLACE FUNCTION public.is_coc()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'coc'
  );
END;
$function$;

DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated 
  USING (
    usuario_id = auth.uid() OR 
    is_responsavel() OR 
    is_admin() OR 
    is_sos() OR 
    is_coc()
  );

DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated 
  USING (
    usuario_id = auth.uid() OR 
    (is_responsavel() AND (responsavel_id = auth.uid() OR status = 'aberto' OR status = 'finalizado')) OR 
    is_admin() OR 
    is_sos() OR 
    is_coc()
  );
