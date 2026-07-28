ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS status_aprovacao TEXT;

DROP POLICY IF EXISTS "diretoria_update_chamados" ON public.chamados;
CREATE POLICY "diretoria_update_chamados" ON public.chamados
  FOR UPDATE TO authenticated
  USING ((SELECT departamento FROM public.perfil_usuario WHERE id = auth.uid()) = 'Diretoria')
  WITH CHECK ((SELECT departamento FROM public.perfil_usuario WHERE id = auth.uid()) = 'Diretoria');

DROP POLICY IF EXISTS "diretoria_select_chamados" ON public.chamados;
CREATE POLICY "diretoria_select_chamados" ON public.chamados
  FOR SELECT TO authenticated
  USING ((SELECT departamento FROM public.perfil_usuario WHERE id = auth.uid()) = 'Diretoria');

DROP POLICY IF EXISTS "diretoria_select_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "diretoria_select_anexos_internos" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING ((SELECT departamento FROM public.perfil_usuario WHERE id = auth.uid()) = 'Diretoria');
