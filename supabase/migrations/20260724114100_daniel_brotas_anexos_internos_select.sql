-- Allow Daniel Brotas to SELECT internal attachments (read-only visibility)
DROP POLICY IF EXISTS "daniel_brotas_select_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "daniel_brotas_select_anexos_internos" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email = 'daniel.brotas@viasudeste.com'
    )
  );
