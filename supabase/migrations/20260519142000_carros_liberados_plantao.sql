DO $$
BEGIN
  -- Safely update the status check constraint to include 'operacao'
  ALTER TABLE public.chamados DROP CONSTRAINT IF EXISTS chamados_status_check;
  ALTER TABLE public.chamados ADD CONSTRAINT chamados_status_check 
    CHECK (status = ANY (ARRAY['aberto', 'em_atendimento', 'finalizado', 'Pendente', 'pendente', 'operacao']));

  -- Ensure public.chamados is in supabase_realtime publication
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chamados'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados;
  END IF;
END $$;

-- Allow public to select OS de Manutenção
DROP POLICY IF EXISTS "chamados_select_public_manutencao" ON public.chamados;
CREATE POLICY "chamados_select_public_manutencao" ON public.chamados
  FOR SELECT TO public
  USING (tipo_chamado = 'OS de Manutenção');

-- Allow public to update OS de Manutenção to send to operation
DROP POLICY IF EXISTS "chamados_update_public_manutencao" ON public.chamados;
CREATE POLICY "chamados_update_public_manutencao" ON public.chamados
  FOR UPDATE TO public
  USING (tipo_chamado = 'OS de Manutenção')
  WITH CHECK (tipo_chamado = 'OS de Manutenção');
