-- Add indexes for numero_os columns to improve search fallback performance in Technical Secretariat dashboard
CREATE INDEX IF NOT EXISTS idx_chamados_numero_os ON public.chamados USING btree (numero_os);
CREATE INDEX IF NOT EXISTS idx_documentos_numero_os ON public.documentos USING btree (numero_os);
