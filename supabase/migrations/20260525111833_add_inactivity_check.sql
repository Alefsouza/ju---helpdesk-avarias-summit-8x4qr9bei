-- 1. Update the check constraint to allow 'pendente' as an action in historico_chamado
ALTER TABLE public.historico_chamado DROP CONSTRAINT IF EXISTS historico_chamado_acao_check;
ALTER TABLE public.historico_chamado ADD CONSTRAINT historico_chamado_acao_check 
  CHECK ((acao = ANY (ARRAY['criado'::text, 'atribuido'::text, 'respondido'::text, 'finalizado'::text, 'deletado'::text, 'transferido'::text, 'reaberto'::text, 'pendente'::text])));

-- 2. Create the function to mark inactive tickets as pending
CREATE OR REPLACE FUNCTION public.marcar_chamados_pendentes_por_inatividade()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_chamado_id uuid;
  v_admin_id uuid;
  v_count integer := 0;
BEGIN
  -- Pega o ID de um administrador para registrar a alteração no histórico
  SELECT id INTO v_admin_id 
  FROM public.perfil_usuario 
  WHERE tipo_usuario = 'admin' 
  ORDER BY criado_em ASC 
  LIMIT 1;
  
  -- Se não encontrar um admin, pega qualquer usuário responsável (fallback de segurança)
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id 
    FROM public.perfil_usuario 
    WHERE tipo_usuario = 'responsavel' 
    ORDER BY criado_em ASC 
    LIMIT 1;
  END IF;

  FOR v_chamado_id IN 
    SELECT c.id 
    FROM public.chamados c
    WHERE c.status NOT IN ('finalizado', 'Pendente', 'pendente', 'deletado')
      AND c.atualizado_em < NOW() - INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.respostas_chamado r WHERE r.chamado_id = c.id AND r.criado_em >= NOW() - INTERVAL '30 days'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.anexos_chamado a WHERE a.chamado_id = c.id AND a.criado_em >= NOW() - INTERVAL '30 days'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.anexos_chamado_interno ai WHERE ai.chamado_id = c.id AND ai.criado_em >= NOW() - INTERVAL '30 days'
      )
  LOOP
    -- Atualiza o status do chamado
    UPDATE public.chamados 
    SET 
      status = 'pendente',
      atualizado_em = NOW()
    WHERE id = v_chamado_id;

    -- Insere o registro de histórico, se tivermos um usuário válido
    IF v_admin_id IS NOT NULL THEN
      INSERT INTO public.historico_chamado (chamado_id, acao, usuario_id, detalhes)
      VALUES (v_chamado_id, 'pendente', v_admin_id, 'Chamado movido para Pendente, pois não houve interação por mais de 30 dias.');
    END IF;
    
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Chamados inativos movidos para pendente: %', v_count;
END;
$function$;

-- 3. Configura o job se a extensão pg_cron estiver habilitada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'cron' AND p.proname = 'schedule'
  ) THEN
    -- Try to unschedule first to avoid duplicates
    BEGIN
      PERFORM cron.unschedule('verificar-inatividade-chamados-diario');
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;
    
    -- Agenda a execução da rotina a cada 24 horas (meia-noite)
    PERFORM cron.schedule('verificar-inatividade-chamados-diario', '0 0 * * *', 'SELECT public.marcar_chamados_pendentes_por_inatividade();');
  END IF;
END $$;
