-- Migration to formalize 'unificado' as a valid terminal status
CREATE OR REPLACE FUNCTION marcar_chamados_pendentes_por_inatividade()
RETURNS void AS $$
BEGIN
  UPDATE chamados
  SET prioridade = 'alta', atualizado_em = NOW()
  WHERE status NOT IN ('finalizado', 'unificado')
    AND prioridade != 'alta'
    AND (atualizado_em < NOW() - INTERVAL '48 hours' OR atualizado_em IS NULL);
END;
$$ LANGUAGE plpgsql;
