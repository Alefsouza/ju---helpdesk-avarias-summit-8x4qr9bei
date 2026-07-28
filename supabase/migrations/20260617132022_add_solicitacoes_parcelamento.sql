CREATE TABLE IF NOT EXISTS public.solicitacoes_parcelamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  usuario_solicitante_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registro_colaborador text NOT NULL,
  nome_colaborador text NOT NULL,
  valor_orcamento numeric NOT NULL,
  quantidade_parcelas integer NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_parcelamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_solicitacoes" ON public.solicitacoes_parcelamento;
CREATE POLICY "select_solicitacoes" ON public.solicitacoes_parcelamento
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_solicitacoes" ON public.solicitacoes_parcelamento;
CREATE POLICY "insert_solicitacoes" ON public.solicitacoes_parcelamento
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_solicitacoes" ON public.solicitacoes_parcelamento;
CREATE POLICY "update_solicitacoes" ON public.solicitacoes_parcelamento
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.trg_notify_solicitacao_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  v_short_id text;
BEGIN
  IF NEW.status <> OLD.status AND NEW.status IN ('aprovado', 'recusado') THEN
    v_short_id := UPPER(SPLIT_PART(NEW.chamado_id::text, '-', 1));
    
    INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
    VALUES (
      NEW.usuario_solicitante_id, 
      'Solicitação de Parcelamento ' || INITCAP(NEW.status), 
      'A solicitação de parcelamento em ' || NEW.quantidade_parcelas || 'x para o orçamento de R$ ' || NEW.valor_orcamento || ' foi ' || NEW.status || '.', 
      '/dashboard/chamados/' || NEW.chamado_id
    );
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS on_solicitacao_status_change ON public.solicitacoes_parcelamento;
CREATE TRIGGER on_solicitacao_status_change
  AFTER UPDATE OF status ON public.solicitacoes_parcelamento
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_solicitacao_status();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'solicitacoes_parcelamento'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_parcelamento;
  END IF;
END $$;
