DO $$
BEGIN
  DELETE FROM public.historico_chamado 
  WHERE detalhes ILIKE 'Vale gerado com sucesso no valor de R$%900,00 parcelado em 3x.%'
    AND criado_em >= '2026-06-01'::date;
END $$;
