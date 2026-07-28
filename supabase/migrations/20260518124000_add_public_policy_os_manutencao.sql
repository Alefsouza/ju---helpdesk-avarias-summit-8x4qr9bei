DO $$
BEGIN
  DROP POLICY IF EXISTS "documentos_select_public_os" ON public.documentos;
  CREATE POLICY "documentos_select_public_os" ON public.documentos
    FOR SELECT TO public
    USING (tipo_documento = 'Vistoria' AND numero_os IS NOT NULL AND numero_os != '');
END $$;
