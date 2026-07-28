DO $$
BEGIN
  -- Retroactive data update: Change status of previously unified tickets from 'finalizado' to 'unificado'
  -- Tickets are identified by checking the historico_chamado for the 'unificado' action
  UPDATE public.chamados c
  SET status = 'unificado'
  WHERE status = 'finalizado' 
  AND EXISTS (
    SELECT 1 FROM public.historico_chamado hc
    WHERE hc.chamado_id = c.id AND hc.acao = 'unificado'
  );
END $$;
