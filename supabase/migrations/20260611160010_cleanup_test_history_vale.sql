DO $$
BEGIN
  -- Delete the specific test entry from historico_chamado
  DELETE FROM public.historico_chamado
  WHERE detalhes = 'Autorização de Desconto gerada com sucesso no valor de R$ 72,00 parcelada em 1x.'
  AND DATE(criado_em AT TIME ZONE 'America/Sao_Paulo') = '2026-06-11';
END $$;

-- Ensure edge functions have appropriate access when using service role
GRANT SELECT ON public.formularios_espelho_danos TO service_role;
GRANT SELECT ON public.chamados TO service_role;
GRANT SELECT ON public.perfil_usuario TO service_role;
