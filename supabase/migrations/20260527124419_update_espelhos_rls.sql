DO $$
BEGIN
  -- Ensure the select policy on formularios_espelho_danos applies garage filter for vistoriadores
  DROP POLICY IF EXISTS "formularios_espelho_danos_select" ON public.formularios_espelho_danos;
  CREATE POLICY "formularios_espelho_danos_select" ON public.formularios_espelho_danos
    FOR SELECT TO authenticated
    USING (
      (chamado_id IN (SELECT id FROM public.chamados WHERE usuario_id = auth.uid() OR responsavel_id = auth.uid()))
      OR public.is_admin()
      OR public.is_responsavel()
      OR public.is_sinistro()
      OR public.is_juridico()
      OR public.is_secretaria_tecnica()
      OR (public.is_vistoriador() AND garagem = (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()))
    );

  -- Ensure the select policy on documentos applies garage filter for vistoriadores
  DROP POLICY IF EXISTS "documentos_select" ON public.documentos;
  CREATE POLICY "documentos_select" ON public.documentos
    FOR SELECT TO authenticated
    USING (
      (NOT public.is_vistoriador()) OR (garagem = (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()))
    );
END $$;
