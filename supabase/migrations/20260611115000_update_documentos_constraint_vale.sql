-- Drop existing check constraint if it exists
ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_tipo_documento_check;

-- Add updated check constraint to include 'Vale' and 'OS de Manutenção' (which is already used in RLS)
ALTER TABLE public.documentos ADD CONSTRAINT documentos_tipo_documento_check 
  CHECK (tipo_documento = ANY (ARRAY[
    'IDO'::text, 
    'Espelho de Danos'::text, 
    'Vistoria'::text, 
    'Boletim de Ocorrência'::text, 
    'Apólice'::text, 
    'Valor do acordo'::text, 
    'Relato manuscrito'::text, 
    'OS de Manutenção'::text, 
    'Orçamento'::text,
    'Vale'::text
  ]));
