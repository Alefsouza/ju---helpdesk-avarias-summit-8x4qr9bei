DO $$
BEGIN
  -- Add new column for requisitions
  ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS fotos_requisicao jsonb DEFAULT '[]'::jsonb;
END $$;

DO $$
BEGIN
  -- Data correction for specific ticket
  UPDATE public.chamados 
  SET responsavel_id = (SELECT id FROM public.perfil_usuario WHERE nome_completo ILIKE '%Luiz Gabriel%' LIMIT 1) 
  WHERE titulo ILIKE '%QUEDA DE PASSAGEIRO%' AND carro = '51077';
END $$;
