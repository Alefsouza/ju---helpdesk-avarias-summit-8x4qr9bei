-- Add 'Justificativa: Não Houve Orçamento' to the allowed acao values in historico_chamado
ALTER TABLE public.historico_chamado DROP CONSTRAINT IF EXISTS historico_chamado_acao_check;

ALTER TABLE public.historico_chamado ADD CONSTRAINT historico_chamado_acao_check
  CHECK (acao = ANY (ARRAY[
    'criado'::text,
    'atribuido'::text,
    'respondido'::text,
    'finalizado'::text,
    'deletado'::text,
    'transferido'::text,
    'reaberto'::text,
    'pendente'::text,
    'Justificativa: Não Houve Orçamento'::text
  ]));
