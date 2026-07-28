-- Function to trigger an update on documentos when the parent chamado's PIA (RA) changes
-- This ensures full reactivity via realtime subscriptions on the documentos table 
-- to maintain UI Consistency in the Technical Secretariat dashboard.
CREATE OR REPLACE FUNCTION public.sync_documentos_on_chamado_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.pia IS DISTINCT FROM NEW.pia THEN
    UPDATE public.documentos
    SET atualizado_em = NOW()
    WHERE chamado_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS trg_sync_documentos_on_chamado_update ON public.chamados;
CREATE TRIGGER trg_sync_documentos_on_chamado_update
  AFTER UPDATE OF pia ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_documentos_on_chamado_update();
