DO $$
BEGIN
  -- Drop the existing policy to recreate it with the correct rules
  DROP POLICY IF EXISTS "anexos_internos_delete" ON public.anexos_chamado_interno;
  
  -- Create the updated policy
  -- Allows DELETE if user is an admin, sinistro, juridico, secretaria_tecnica, 
  -- the uploader of the file, or the responsible for the ticket.
  CREATE POLICY "anexos_internos_delete" ON public.anexos_chamado_interno
    FOR DELETE TO authenticated
    USING (
      is_admin() OR 
      is_sinistro() OR 
      is_juridico() OR 
      is_secretaria_tecnica() OR 
      (usuario_id = auth.uid()) OR 
      (chamado_id IN (SELECT id FROM public.chamados WHERE responsavel_id = auth.uid()))
    );
END $$;
