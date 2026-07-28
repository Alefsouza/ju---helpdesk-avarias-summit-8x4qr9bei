-- Automatically approve new Vales by default
ALTER TABLE public.solicitacoes_parcelamento
ALTER COLUMN status SET DEFAULT 'aprovado';

-- Update existing pending Vales to approved
DO $$
BEGIN
  UPDATE public.solicitacoes_parcelamento
  SET status = 'aprovado', atualizado_em = NOW()
  WHERE status = 'pendente';
END $$;

-- Hide 'Vale' documents from the Ticket Details page (Anexos e Documentos)
-- We use a restrictive policy that checks the referer header. If the request
-- comes from the Ticket Details page, we hide the 'Vale'. Otherwise, we allow it
-- (e.g., in the DP dashboard where financial documents are still needed).
DROP POLICY IF EXISTS "hide_vales_on_ticket_details" ON public.documentos;
CREATE POLICY "hide_vales_on_ticket_details" ON public.documentos
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    tipo_documento != 'Vale'
    OR
    COALESCE(current_setting('request.headers', true), '{"referer": ""}')::jsonb ->> 'referer' NOT LIKE '%/dashboard/chamados/%'
  );
