ALTER TABLE IF EXISTS public.chamados ADD COLUMN IF NOT EXISTS status_juridico TEXT;

CREATE OR REPLACE FUNCTION public.is_juridico()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario
    WHERE id = auth.uid() AND tipo_usuario = 'juridico'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "permitir_atualizacao_juridico" ON public.chamados;
CREATE POLICY "permitir_atualizacao_juridico" ON public.chamados
  FOR UPDATE TO authenticated
  USING (public.is_juridico())
  WITH CHECK (public.is_juridico());
