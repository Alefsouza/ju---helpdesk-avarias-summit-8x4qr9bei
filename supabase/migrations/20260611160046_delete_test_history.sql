DELETE FROM public.historico_chamado
WHERE detalhes LIKE '%Autorização de Desconto gerada com sucesso%'
  AND (
    to_char(criado_em AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') = '2026-06-11 12:41'
    OR
    to_char(criado_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') = '2026-06-11 12:41'
  );
