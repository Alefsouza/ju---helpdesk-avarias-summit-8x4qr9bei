-- Adicionar coluna fotos_requisicao na tabela documentos
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS fotos_requisicao jsonb DEFAULT '[]'::jsonb;

-- Corrige o responsável do chamado 51077 conforme solicitado
DO $$
DECLARE
  v_luiz_id uuid;
BEGIN
  -- Tentar encontrar o UUID do colaborador Luiz Gabriel
  SELECT id INTO v_luiz_id
  FROM public.perfil_usuario
  WHERE nome_completo ILIKE '%Luiz Gabriel%'
  LIMIT 1;

  -- Se encontrado, atualiza o chamado específico
  IF v_luiz_id IS NOT NULL THEN
    UPDATE public.chamados
    SET responsavel_id = v_luiz_id,
        atualizado_em = NOW()
    WHERE (titulo ILIKE '%51077%' OR carro = '51077')
      AND titulo ILIKE '%QUEDA DE PASSAGEIRO NO INTERIOR DO VEÍCULO%';
  END IF;
END $$;
