-- Fix parcelas_vales.valor_parcela for the chamado with titulo 'Avaria no carro 5 1019 - OS 323787'
-- Updates valor_parcela from 98.02 to 88.22 to match the Autorização de Desconto document
DO $$
DECLARE
  v_chamado_id uuid;
BEGIN
  -- Locate the specific chamado by its exact titulo
  SELECT id INTO v_chamado_id
  FROM public.chamados
  WHERE titulo = 'Avaria no carro 5 1019 - OS 323787'
  LIMIT 1;

  IF v_chamado_id IS NOT NULL THEN
    -- Only update if the current value is still 98.02 (idempotent safeguard)
    UPDATE public.parcelas_vales
    SET valor_parcela = 88.22
    WHERE chamado_id = v_chamado_id
      AND valor_parcela = 98.02;

    -- Keep solicitacoes_parcelamento consistent with the corrected value
    UPDATE public.solicitacoes_parcelamento
    SET valor_orcamento = 88.22,
        quantidade_parcelas = 1,
        desconto_aplicado = false,
        status = 'aprovado',
        atualizado_em = NOW()
    WHERE chamado_id = v_chamado_id
      AND (valor_orcamento <> 88.22 OR quantidade_parcelas <> 1);
  END IF;
END $$;
