DO $$
BEGIN
  -- 1. Políticas de SELECT para a tabela 'documentos' para o departamento DP
  DROP POLICY IF EXISTS "dp_select_documentos" ON public.documentos;
  CREATE POLICY "dp_select_documentos" ON public.documentos
    FOR SELECT TO authenticated
    USING (public.is_dp());

  -- 2. Políticas de SELECT para a tabela 'anexos_chamado_interno' para o departamento DP
  DROP POLICY IF EXISTS "dp_select_anexos_internos" ON public.anexos_chamado_interno;
  CREATE POLICY "dp_select_anexos_internos" ON public.anexos_chamado_interno
    FOR SELECT TO authenticated
    USING (public.is_dp());

  -- 3. Políticas de SELECT no storage.objects para que o DP consiga acessar/baixar os documentos
  DROP POLICY IF EXISTS "dp_select_storage_objects" ON storage.objects;
  CREATE POLICY "dp_select_storage_objects" ON storage.objects
    FOR SELECT TO authenticated
    USING (public.is_dp());
END $$;
