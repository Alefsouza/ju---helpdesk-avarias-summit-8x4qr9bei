-- Add status_juridico column safely
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS status_juridico TEXT;

-- Create policy allowing juridico users to update chamados if they need access
DROP POLICY IF EXISTS "permitir_atualizacao_juridico" ON public.chamados;
CREATE POLICY "permitir_atualizacao_juridico" ON public.chamados
  FOR UPDATE TO authenticated
  USING (public.is_juridico());
