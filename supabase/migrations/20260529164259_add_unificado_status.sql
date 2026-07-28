DO $$
BEGIN
  ALTER TABLE public.chamados DROP CONSTRAINT IF EXISTS chamados_status_check;
  ALTER TABLE public.chamados ADD CONSTRAINT chamados_status_check 
    CHECK (status = ANY (ARRAY['aberto'::text, 'em_atendimento'::text, 'finalizado'::text, 'Pendente'::text, 'pendente'::text, 'operacao'::text, 'unificado'::text]));
END $$;
