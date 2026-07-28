DO $$
BEGIN
  -- Migra dados existentes de 'nome_motorista' para 'nome_responsavel' no caso do Espelho de Danos
  -- para manter o mapeamento genérico da nova listagem de Documentos
  UPDATE public.documentos
  SET nome_responsavel = nome_motorista
  WHERE tipo_documento = 'Espelho de Danos' AND nome_motorista IS NOT NULL;

  -- Remove a coluna que não será mais utilizada
  ALTER TABLE public.documentos DROP COLUMN IF EXISTS nome_motorista;
END $$;
