-- Ensure the status column can accept 'unificado' by dropping any existing check constraints if they exist
ALTER TABLE IF EXISTS public.chamados DROP CONSTRAINT IF EXISTS chamados_status_check;

-- Perform a batch update to avoid statement timeouts on potentially large tables
DO $$
DECLARE
  batch_size INT := 1000;
  affected INT;
BEGIN
  LOOP
    WITH to_update AS (
      SELECT id 
      FROM public.chamados
      WHERE status = 'finalizado'
      AND (
        descricao ILIKE '%Este chamado foi unificado%'
        OR titulo ILIKE '%Avaria no carro 52154 - OS 323532%'
        OR EXISTS (
          SELECT 1 
          FROM public.historico_chamado hc
          WHERE hc.chamado_id = public.chamados.id
          AND (hc.acao ILIKE '%unificad%' OR hc.detalhes ILIKE '%unificad%')
        )
      )
      LIMIT batch_size
    )
    UPDATE public.chamados
    SET 
      status = 'unificado',
      atualizado_em = NOW()
    WHERE id IN (SELECT id FROM to_update);

    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
