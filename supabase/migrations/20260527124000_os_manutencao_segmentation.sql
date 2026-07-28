-- Auto-Tagging trigger to set 'garagem' automatically for new records
CREATE OR REPLACE FUNCTION public.set_garagem_from_profile()
RETURNS trigger AS $$
BEGIN
  IF NEW.garagem IS NULL OR NEW.garagem = '' THEN
    SELECT garagem INTO NEW.garagem
    FROM public.perfil_usuario
    WHERE id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_chamados_set_garagem ON public.chamados;
CREATE TRIGGER trg_chamados_set_garagem
  BEFORE INSERT ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.set_garagem_from_profile();

DROP TRIGGER IF EXISTS trg_documentos_set_garagem ON public.documentos;
CREATE TRIGGER trg_documentos_set_garagem
  BEFORE INSERT ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_garagem_from_profile();

DROP TRIGGER IF EXISTS trg_formularios_espelho_danos_set_garagem ON public.formularios_espelho_danos;
CREATE TRIGGER trg_formularios_espelho_danos_set_garagem
  BEFORE INSERT ON public.formularios_espelho_danos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_garagem_from_profile();

-- Recreate RLS policies ensuring consistent garage data access control
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
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
    is_secretaria_tecnica() OR 
    (is_vistoriador() AND (garagem = (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()))) OR
    (is_sinistro() AND (
      ((SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()) IS NOT NULL) AND 
      ((SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()) = COALESCE(garagem, (SELECT garagem FROM public.perfil_usuario WHERE id = public.chamados.usuario_id)))
    ))
  );

DROP POLICY IF EXISTS "documentos_select" ON public.documentos;
CREATE POLICY "documentos_select" ON public.documentos
  FOR SELECT TO authenticated
  USING (
    (NOT is_vistoriador()) OR 
    (garagem = (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "formularios_espelho_danos_select" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_select" ON public.formularios_espelho_danos
  FOR SELECT TO authenticated
  USING (
    (chamado_id IN (SELECT id FROM public.chamados WHERE usuario_id = auth.uid() OR responsavel_id = auth.uid())) OR 
    is_admin() OR 
    is_responsavel() OR 
    is_sinistro() OR 
    is_juridico() OR 
    is_secretaria_tecnica() OR 
    (is_vistoriador() AND (garagem = (SELECT garagem FROM public.perfil_usuario WHERE id = auth.uid())))
  );
