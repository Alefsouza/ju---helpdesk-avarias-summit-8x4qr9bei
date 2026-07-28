-- Fix parcelas_vales and solicitacoes_parcelamento for OS 323787 (Carro 5, Prefixo 1019)
-- The Autorização de Desconto specifies R$ 88,22 for Parcela 1/1
DO $$
DECLARE
  v_chamado_id uuid;
BEGIN
  SELECT id INTO v_chamado_id FROM public.chamados WHERE numero_os = '323787' LIMIT 1;

  IF v_chamado_id IS NOT NULL THEN
    -- Update parcelas_vales to match the Autorização de Desconto
    UPDATE public.parcelas_vales
    SET valor_parcela = 88.22
    WHERE chamado_id = v_chamado_id;

    -- Ensure solicitacoes_parcelamento is consistent
    -- valor_orcamento / quantidade_parcelas = valor_parcela
    UPDATE public.solicitacoes_parcelamento
    SET valor_orcamento = 88.22,
        quantidade_parcelas = 1,
        desconto_aplicado = false,
        status = 'aprovado',
        atualizado_em = NOW()
    WHERE chamado_id = v_chamado_id;
  END IF;
END $$;
