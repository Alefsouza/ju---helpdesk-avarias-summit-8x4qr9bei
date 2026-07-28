DO $$
BEGIN
  -- Add numero_os to chamados if it doesn't exist
  ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS numero_os text;

  -- Update perfil_usuario constraints to allow 'sos' type
  ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_tipo_usuario_check;
  ALTER TABLE public.perfil_usuario ADD CONSTRAINT perfil_usuario_tipo_usuario_check 
    CHECK (tipo_usuario = ANY (ARRAY['basico', 'responsavel', 'admin', 'vistoriador', 'coc', 'sos']));
END $$;

-- Function to check if user is sos
CREATE OR REPLACE FUNCTION public.is_sos()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'sos'
  );
END;
$function$;

-- Update chamados RLS policies to include sos read/write access
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated
  USING ((usuario_id = auth.uid()) OR is_responsavel() OR is_admin() OR is_sos());

DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated
  USING ((usuario_id = auth.uid()) OR (is_responsavel() AND ((responsavel_id = auth.uid()) OR (status = 'aberto'::text) OR (status = 'finalizado'::text))) OR is_admin() OR is_sos());

-- Add policy to allow SOS to view attachments
DROP POLICY IF EXISTS "anexos_internos_select" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_select" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (is_responsavel() OR is_admin() OR is_sos());

DROP POLICY IF EXISTS "anexos_select" ON public.anexos_chamado;
CREATE POLICY "anexos_select" ON public.anexos_chamado
  FOR SELECT TO authenticated
  USING (chamado_id IN (SELECT id FROM chamados));
