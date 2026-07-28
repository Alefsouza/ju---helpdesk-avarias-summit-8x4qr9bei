-- Adiciona ou atualiza a função is_secretaria_tecnica
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

-- Atualiza a constraint de tipo_usuario no perfil de usuario
ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_tipo_usuario_check;
ALTER TABLE public.perfil_usuario ADD CONSTRAINT perfil_usuario_tipo_usuario_check CHECK (tipo_usuario = ANY (ARRAY['basico'::text, 'responsavel'::text, 'admin'::text, 'vistoriador'::text, 'coc'::text, 'sos'::text, 'juridico'::text, 'sinistro'::text, 'secretaria_tecnica'::text]));

-- Atualiza a política de UPDATE de documentos para permitir edições da secretaria_tecnica
DROP POLICY IF EXISTS "documentos_update" ON public.documentos;
CREATE POLICY "documentos_update" ON public.documentos
  FOR UPDATE TO authenticated
  USING (
    ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_vistoriador() OR is_juridico() OR is_secretaria_tecnica())
  )
  WITH CHECK (
    ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_vistoriador() OR is_juridico() OR is_secretaria_tecnica())
  );
