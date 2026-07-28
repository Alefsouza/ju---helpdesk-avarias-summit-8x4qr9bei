-- Ensure status_liberacao accepts 'sem_orcamento' value
-- status_liberacao is a free TEXT column, so no CHECK constraint needs updating.
-- This migration documents the new status and backfills any NULL values if needed.

-- No-op: status_liberacao is TEXT without CHECK constraints, so 'sem_orcamento' is already valid.
-- The historico_chamado.acao CHECK constraint allowing 'Justificativa: Não Houve Orçamento'
-- is handled in migration 20260629165400_add_justificativa_acao_constraint.sql.

SELECT 1;
