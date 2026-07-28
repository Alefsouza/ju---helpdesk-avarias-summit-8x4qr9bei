DO $$
BEGIN
  ALTER TABLE public.historico_chamado DROP CONSTRAINT IF EXISTS historico_chamado_acao_check;
  ALTER TABLE public.historico_chamado ADD CONSTRAINT historico_chamado_acao_check CHECK (acao = ANY (ARRAY['criado'::text, 'atribuido'::text, 'respondido'::text, 'finalizado'::text, 'deletado'::text, 'transferido'::text]));
END $$;
