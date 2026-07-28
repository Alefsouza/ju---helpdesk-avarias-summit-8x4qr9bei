DO $$
BEGIN
  -- We drop the existing CHECK constraint if it exists to make it idempotent
  ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_tipo_documento_check;
  
  -- Add the updated CHECK constraint to include 'Relato manuscrito'
  ALTER TABLE public.documentos ADD CONSTRAINT documentos_tipo_documento_check CHECK (
    tipo_documento = ANY (ARRAY[
      'IDO'::text, 
      'Espelho de Danos'::text, 
      'Vistoria'::text, 
      'Boletim de Ocorrência'::text, 
      'Apólice'::text, 
      'Valor do acordo'::text,
      'Relato manuscrito'::text
    ])
  );
END $$;
