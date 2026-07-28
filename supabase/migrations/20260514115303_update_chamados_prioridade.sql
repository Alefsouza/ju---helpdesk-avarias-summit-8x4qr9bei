DO $$
BEGIN
  ALTER TABLE public.chamados DROP CONSTRAINT IF EXISTS chamados_prioridade_check;
  
  ALTER TABLE public.chamados ALTER COLUMN prioridade DROP DEFAULT;
  ALTER TABLE public.chamados ALTER COLUMN prioridade DROP NOT NULL;
  
  ALTER TABLE public.chamados ADD CONSTRAINT chamados_prioridade_check 
    CHECK (prioridade IS NULL OR prioridade = ANY (ARRAY['baixa', 'media', 'alta', 'urgente']));
END $$;
