DO $$
BEGIN
  -- Limpa as entradas de teste referentes à "Autorização de Desconto" de valor R$ 72,00.
  -- Usamos LIKE para garantir que pegamos variações com o prefixo se ele foi salvo no banco.
  DELETE FROM public.historico_chamado 
  WHERE detalhes LIKE '%R$ 72,00%' 
    AND (detalhes LIKE '%11/06/2026 12:41%' OR detalhes LIKE '%Autorização de Desconto gerada com sucesso%');
END $$;
