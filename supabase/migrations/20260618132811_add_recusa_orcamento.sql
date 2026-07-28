-- Adicionar colunas de recusa de orçamento na tabela documentos
ALTER TABLE public.documentos
ADD COLUMN IF NOT EXISTS is_recusado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS motivo_recusa TEXT;

-- Garantir que a policy de update permita a todos atualizarem esses campos (policy já existente pode cobrir, mas é bom assegurar)
DROP POLICY IF EXISTS "documentos_update_recusa" ON public.documentos;
CREATE POLICY "documentos_update_recusa" ON public.documentos
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
