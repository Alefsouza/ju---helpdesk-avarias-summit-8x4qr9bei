DO $$
DECLARE
  v_chamado_id uuid;
BEGIN
  -- Identifica o ID do chamado alvo
  SELECT id INTO v_chamado_id
  FROM public.chamados
  WHERE numero_os = '899974' OR titulo = 'Avaria no carro 52864 - OS 899974'
  LIMIT 1;

  -- Se o chamado for encontrado, remove os registros específicos do histórico
  IF v_chamado_id IS NOT NULL THEN
    -- Remove o primeiro registro incorreto (R$ 900,00 em 3x)
    DELETE FROM public.historico_chamado
    WHERE chamado_id = v_chamado_id
      AND detalhes = 'Autorização de Desconto gerada com sucesso no valor de R$ 900,00 parcelada em 3x.';

    -- Remove o segundo registro incorreto (R$ 1.000,00 em 4x)
    DELETE FROM public.historico_chamado
    WHERE chamado_id = v_chamado_id
      AND detalhes = 'Autorização de Desconto gerada com sucesso no valor de R$ 1.000,00 parcelada em 4x.';
  END IF;
END $$;
