DO $$
BEGIN
  ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_tipo_documento_check;
  
  ALTER TABLE public.documentos ADD CONSTRAINT documentos_tipo_documento_check 
  CHECK (tipo_documento = ANY (ARRAY['IDO'::text, 'Espelho de Danos'::text, 'Vistoria'::text, 'Boletim de Ocorrência'::text, 'Apólice'::text, 'Valor do acordo'::text]));
END $$;
