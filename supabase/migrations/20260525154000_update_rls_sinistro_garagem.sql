DO $$
BEGIN
  -- Drop existing policies for chamados table
  DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
  DROP POLICY IF EXISTS "chamados_update" ON public.chamados;

  -- Create updated SELECT policy that enforces regional garage filtering for 'sinistro' users
  CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    (usuario_id = auth.uid()) OR
    (responsavel_id = auth.uid()) OR
    is_admin() OR
    is_responsavel() OR
    is_sos() OR
    is_coc() OR
    is_juridico() OR
    (is_sinistro() AND (
      (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()) IS NOT NULL AND
      (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()) = 
      (SELECT garagem FROM public.perfil_usuario WHERE id = chamados.usuario_id)
    ))
  );

  -- Create updated UPDATE policy that enforces regional garage filtering for 'sinistro' users
  CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    (responsavel_id = auth.uid()) OR
    is_admin() OR 
    is_sos() OR 
    is_coc() OR
    (
      (status = 'aberto'::text OR status = 'finalizado'::text) AND 
      (
        is_responsavel() OR 
        is_juridico() OR 
        (is_sinistro() AND (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()) = (SELECT garagem FROM public.perfil_usuario WHERE id = chamados.usuario_id))
      )
    )
  )
  WITH CHECK (
    (usuario_id = auth.uid()) OR 
    (responsavel_id = auth.uid()) OR
    is_admin() OR 
    is_sos() OR 
    is_coc() OR
    (
      (status = 'aberto'::text OR status = 'finalizado'::text) AND 
      (
        is_responsavel() OR 
        is_juridico() OR 
        (is_sinistro() AND (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()) = (SELECT garagem FROM public.perfil_usuario WHERE id = chamados.usuario_id))
      )
    )
  );
END $$;
