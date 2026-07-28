DO $$
BEGIN
  -- Create table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.participantes_chamado (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
    usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    criado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE(chamado_id, usuario_id)
  );
END $$;

-- Enable RLS
ALTER TABLE public.participantes_chamado ENABLE ROW LEVEL SECURITY;

-- Policies for participantes_chamado
DROP POLICY IF EXISTS "participantes_select" ON public.participantes_chamado;
CREATE POLICY "participantes_select" ON public.participantes_chamado
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid() OR
    chamado_id IN (
      SELECT id FROM public.chamados
      WHERE usuario_id = auth.uid() OR responsavel_id = auth.uid()
    ) OR
    public.is_admin() OR public.is_responsavel() OR public.is_sinistro() OR public.is_juridico()
  );

-- Update RLS for chamados
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    (responsavel_id = auth.uid()) OR 
    is_admin() OR is_responsavel() OR is_sos() OR is_coc() OR is_juridico() OR is_secretaria_tecnica() OR 
    (is_vistoriador() AND (garagem = ( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())))) OR 
    (is_sinistro() AND ((( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) IS NOT NULL) AND (( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id)))))) OR
    (id IN (SELECT chamado_id FROM public.participantes_chamado WHERE usuario_id = auth.uid()))
  );

DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    (responsavel_id = auth.uid()) OR 
    is_admin() OR is_sos() OR is_coc() OR 
    (((status = 'aberto'::text) OR (status = 'finalizado'::text)) AND (is_responsavel() OR is_juridico() OR (is_sinistro() AND (( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id))))))) OR
    (id IN (SELECT chamado_id FROM public.participantes_chamado WHERE usuario_id = auth.uid()))
  )
  WITH CHECK (
    (usuario_id = auth.uid()) OR 
    (responsavel_id = auth.uid()) OR 
    is_admin() OR is_sos() OR is_coc() OR 
    (((status = 'aberto'::text) OR (status = 'finalizado'::text)) AND (is_responsavel() OR is_juridico() OR (is_sinistro() AND (( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem FROM perfil_usuario WHERE (perfil_usuario.id = chamados.usuario_id))))))) OR
    (id IN (SELECT chamado_id FROM public.participantes_chamado WHERE usuario_id = auth.uid()))
  );

-- Update RLS for historico_chamado
DROP POLICY IF EXISTS "Permitir SELECT para admin e responsáveis" ON public.historico_chamado;
CREATE POLICY "Permitir SELECT para admin e responsáveis" ON public.historico_chamado
  FOR SELECT TO authenticated
  USING (
    ((( SELECT perfil_usuario.tipo_usuario FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = ANY (ARRAY['admin'::text, 'responsavel'::text, 'sinistro'::text, 'juridico'::text])) OR 
    (chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.usuario_id = auth.uid()))) OR
    (chamado_id IN (SELECT chamado_id FROM public.participantes_chamado WHERE usuario_id = auth.uid())))
  );

-- Update RLS for anexos_chamado
DROP POLICY IF EXISTS "anexos_select" ON public.anexos_chamado;
CREATE POLICY "anexos_select" ON public.anexos_chamado
  FOR SELECT TO authenticated
  USING (
    (chamado_id IN ( SELECT chamados.id FROM chamados)) 
  );

-- Update RLS for anexos_chamado_interno
DROP POLICY IF EXISTS "anexos_internos_select" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_select" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (
    is_responsavel() OR is_sinistro() OR is_admin() OR is_sos() OR is_juridico() OR is_secretaria_tecnica() OR 
    (usuario_id = auth.uid()) OR
    (chamado_id IN (SELECT chamado_id FROM public.participantes_chamado WHERE usuario_id = auth.uid()))
  );

-- Force responses policies to re-evaluate with updated chamados policy
DROP POLICY IF EXISTS "respostas_select" ON public.respostas_chamado;
CREATE POLICY "respostas_select" ON public.respostas_chamado
  FOR SELECT TO authenticated
  USING (
    (usuario_id = auth.uid()) OR 
    (chamado_id IN ( SELECT chamados.id FROM chamados ))
  );

DROP POLICY IF EXISTS "respostas_insert" ON public.respostas_chamado;
CREATE POLICY "respostas_insert" ON public.respostas_chamado
  FOR INSERT TO authenticated
  WITH CHECK (
    (usuario_id = auth.uid()) AND 
    (chamado_id IN ( SELECT chamados.id FROM chamados ))
  );

-- Seed/migration step for existing finalized/unified tickets
DO $$
DECLARE
  rec record;
  match_str text;
  match_id uuid;
BEGIN
  -- Procure chamados cuja descrição indique que foram unificados com outro
  FOR rec IN
    SELECT id, usuario_id, descricao
    FROM public.chamados
    WHERE status = 'finalizado' AND descricao ILIKE '%[SISTEMA]: Este chamado foi unificado com o chamado destino #%'
  LOOP
    -- Tente extrair o UUID do destino a partir da descrição
    match_str := substring(rec.descricao from '#([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})');
    
    IF match_str IS NOT NULL AND rec.usuario_id IS NOT NULL THEN
      BEGIN
        match_id := match_str::uuid;
        INSERT INTO public.participantes_chamado (chamado_id, usuario_id)
        VALUES (match_id, rec.usuario_id)
        ON CONFLICT (chamado_id, usuario_id) DO NOTHING;
      EXCEPTION
        WHEN invalid_text_representation THEN
          -- ignora se não for uuid válido
      END;
    END IF;
  END LOOP;
END $$;
