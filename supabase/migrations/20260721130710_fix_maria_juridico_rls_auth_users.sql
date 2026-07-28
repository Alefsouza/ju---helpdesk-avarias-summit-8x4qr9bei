-- Fix RLS policies on chamados that referenced auth.users directly.
-- The previous policies used a subquery on auth.users which the authenticated
-- role cannot access, causing a 42501 (permission denied for table users) error
-- on pages like /dashboard/cobranca-terceiros.
-- Replace the auth.users lookup with auth.jwt() ->> 'email', which is available
-- without any extra grants.

DROP POLICY IF EXISTS "maria_juridico_select_all" ON public.chamados;
CREATE POLICY "maria_juridico_select_all" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    status_juridico IS NOT NULL
    AND auth.jwt() ->> 'email' = 'maria.rodrigues@viasudeste.com'
  );

DROP POLICY IF EXISTS "maria_juridico_update_all" ON public.chamados;
CREATE POLICY "maria_juridico_update_all" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    status_juridico IS NOT NULL
    AND auth.jwt() ->> 'email' = 'maria.rodrigues@viasudeste.com'
  )
  WITH CHECK (
    status_juridico IS NOT NULL
    AND auth.jwt() ->> 'email' = 'maria.rodrigues@viasudeste.com'
  );
