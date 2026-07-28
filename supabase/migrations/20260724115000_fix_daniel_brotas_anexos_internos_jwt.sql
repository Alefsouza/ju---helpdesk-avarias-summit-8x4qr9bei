-- Fix the SELECT policy on anexos_chamado_interno for Daniel Brotas.
-- The previous policy used a subquery on auth.users, which the authenticated
-- role cannot access, causing a 42501 (permission denied for table users) error.
-- Replace the auth.users lookup with auth.jwt() ->> 'email'.

DROP POLICY IF EXISTS "daniel_brotas_select_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "daniel_brotas_select_anexos_internos" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'daniel.brotas@viasudeste.com'
  );
