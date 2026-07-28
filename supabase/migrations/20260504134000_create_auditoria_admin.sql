CREATE TABLE IF NOT EXISTS public.auditoria_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  acao TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.auditoria_admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_auditoria_select" ON public.auditoria_admin;
CREATE POLICY "admin_auditoria_select" ON public.auditoria_admin
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_auditoria_insert" ON public.auditoria_admin;
CREATE POLICY "admin_auditoria_insert" ON public.auditoria_admin
  FOR INSERT TO authenticated WITH CHECK (is_admin());
