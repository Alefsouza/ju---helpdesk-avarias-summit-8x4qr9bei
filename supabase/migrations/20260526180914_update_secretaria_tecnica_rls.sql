DO $$
BEGIN
    -- Refresh policies for anexos_chamado_interno to explicitly include secretaria_tecnica
    DROP POLICY IF EXISTS "anexos_internos_insert" ON public.anexos_chamado_interno;
    CREATE POLICY "anexos_internos_insert" ON public.anexos_chamado_interno
      FOR INSERT TO authenticated
      WITH CHECK (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica());

    DROP POLICY IF EXISTS "anexos_internos_select" ON public.anexos_chamado_interno;
    CREATE POLICY "anexos_internos_select" ON public.anexos_chamado_interno
      FOR SELECT TO authenticated
      USING (is_responsavel() OR is_sinistro() OR is_admin() OR is_sos() OR is_juridico() OR is_secretaria_tecnica() OR usuario_id = auth.uid());

    -- Ensure historico_chamado allows insertion from any authenticated user
    DROP POLICY IF EXISTS "Permitir INSERT para responsáveis e admin" ON public.historico_chamado;
    CREATE POLICY "Permitir INSERT para responsáveis e admin" ON public.historico_chamado
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
END $$;
