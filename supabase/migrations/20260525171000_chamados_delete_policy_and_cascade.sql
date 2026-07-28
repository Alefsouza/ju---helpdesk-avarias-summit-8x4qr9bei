DO $$
BEGIN
  -- Recreate constraint on historico_chamado
  ALTER TABLE public.historico_chamado DROP CONSTRAINT IF EXISTS historico_chamado_chamado_id_fkey;
  ALTER TABLE public.historico_chamado ADD CONSTRAINT historico_chamado_chamado_id_fkey 
    FOREIGN KEY (chamado_id) REFERENCES public.chamados(id) ON DELETE CASCADE;

  -- Recreate constraint on respostas_chamado
  ALTER TABLE public.respostas_chamado DROP CONSTRAINT IF EXISTS respostas_chamado_chamado_id_fkey;
  ALTER TABLE public.respostas_chamado ADD CONSTRAINT respostas_chamado_chamado_id_fkey 
    FOREIGN KEY (chamado_id) REFERENCES public.chamados(id) ON DELETE CASCADE;

  -- Recreate constraint on anexos_chamado
  ALTER TABLE public.anexos_chamado DROP CONSTRAINT IF EXISTS anexos_chamado_chamado_id_fkey;
  ALTER TABLE public.anexos_chamado ADD CONSTRAINT anexos_chamado_chamado_id_fkey 
    FOREIGN KEY (chamado_id) REFERENCES public.chamados(id) ON DELETE CASCADE;

  -- Recreate constraint on anexos_chamado_interno
  ALTER TABLE public.anexos_chamado_interno DROP CONSTRAINT IF EXISTS anexos_chamado_interno_chamado_id_fkey;
  ALTER TABLE public.anexos_chamado_interno ADD CONSTRAINT anexos_chamado_interno_chamado_id_fkey 
    FOREIGN KEY (chamado_id) REFERENCES public.chamados(id) ON DELETE CASCADE;

  -- Recreate constraint on formularios_espelho_danos
  ALTER TABLE public.formularios_espelho_danos DROP CONSTRAINT IF EXISTS formularios_espelho_danos_chamado_id_fkey;
  ALTER TABLE public.formularios_espelho_danos ADD CONSTRAINT formularios_espelho_danos_chamado_id_fkey 
    FOREIGN KEY (chamado_id) REFERENCES public.chamados(id) ON DELETE CASCADE;

  -- Recreate constraint on formularios_ido
  ALTER TABLE public.formularios_ido DROP CONSTRAINT IF EXISTS formularios_ido_chamado_id_fkey;
  ALTER TABLE public.formularios_ido ADD CONSTRAINT formularios_ido_chamado_id_fkey 
    FOREIGN KEY (chamado_id) REFERENCES public.chamados(id) ON DELETE CASCADE;

END $$;

-- Add RLS policy for deleting chamados
DROP POLICY IF EXISTS "chamados_delete" ON public.chamados;
CREATE POLICY "chamados_delete" ON public.chamados
  FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR is_admin());
