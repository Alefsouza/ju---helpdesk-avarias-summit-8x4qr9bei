DO $$
BEGIN
  -- We drop the existing check constraint on tipo_documento and add a new one that allows the required types
  ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_tipo_documento_check;
  
  ALTER TABLE public.documentos ADD CONSTRAINT documentos_tipo_documento_check 
  CHECK ((tipo_documento = ANY (ARRAY[
    'IDO'::text, 
    'Espelho de Danos'::text, 
    'Vistoria'::text, 
    'Boletim de Ocorrência'::text, 
    'Apólice'::text, 
    'Valor do acordo'::text, 
    'Relato manuscrito'::text, 
    'OS de Manutenção'::text, 
    'Orçamento'::text, 
    'Vale'::text,
    'CNH'::text,
    'Documento do veículo'::text,
    'Fotos/Vídeos'::text,
    'Anexo Lesão Corporal'::text,
    'Outros'::text
  ])));
END $$;
