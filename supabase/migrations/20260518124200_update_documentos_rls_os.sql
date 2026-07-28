DROP POLICY IF EXISTS "documentos_select_public_os" ON public.documentos;
CREATE POLICY "documentos_select_public_os" ON public.documentos
  FOR SELECT TO public 
  USING (
    tipo_documento IN ('Vistoria', 'Espelho de Danos') 
    AND numero_os IS NOT NULL 
    AND numero_os <> ''
  );
