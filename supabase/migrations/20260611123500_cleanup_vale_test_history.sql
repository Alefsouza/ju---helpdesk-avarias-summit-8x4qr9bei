DO $$
BEGIN
  -- Remove test entries from historico_chamado.
  -- We use a wildcard between R$ and the value to account for potential non-breaking spaces
  -- introduced by Intl.NumberFormat during the frontend generation.
  DELETE FROM public.historico_chamado
  WHERE detalhes LIKE '%Vale gerado com sucesso no valor de R$%675,00 parcelado em 2x.%';
END $$;
