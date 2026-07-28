DO $$
BEGIN
  DROP POLICY IF EXISTS "parcelas_vales_insert" ON public.parcelas_vales;
  DROP POLICY IF EXISTS "parcelas_vales_select" ON public.parcelas_vales;
  DROP POLICY IF EXISTS "parcelas_vales_update" ON public.parcelas_vales;
  DROP POLICY IF EXISTS "parcelas_vales_delete" ON public.parcelas_vales;
END $$;

CREATE POLICY "parcelas_vales_insert" ON public.parcelas_vales
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfil_usuario
    WHERE id = auth.uid()
    AND (departamento IN ('DP', 'Diretoria') OR tipo_usuario = 'admin')
  )
);

CREATE POLICY "parcelas_vales_select" ON public.parcelas_vales
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfil_usuario
    WHERE id = auth.uid()
    AND (departamento IN ('DP', 'Diretoria') OR tipo_usuario = 'admin')
  )
);

CREATE POLICY "parcelas_vales_update" ON public.parcelas_vales
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfil_usuario
    WHERE id = auth.uid()
    AND (departamento IN ('DP', 'Diretoria') OR tipo_usuario = 'admin')
  )
);

CREATE POLICY "parcelas_vales_delete" ON public.parcelas_vales
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfil_usuario
    WHERE id = auth.uid()
    AND tipo_usuario = 'admin'
  )
);
