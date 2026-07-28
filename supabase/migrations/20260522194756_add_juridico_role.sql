-- Update check constraint on perfil_usuario
ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_tipo_usuario_check;
ALTER TABLE public.perfil_usuario ADD CONSTRAINT perfil_usuario_tipo_usuario_check CHECK (tipo_usuario = ANY (ARRAY['basico'::text, 'responsavel'::text, 'admin'::text, 'vistoriador'::text, 'coc'::text, 'sos'::text, 'juridico'::text]));

-- Create is_juridico function
CREATE OR REPLACE FUNCTION public.is_juridico()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'juridico'
  );
END;
$function$;

-- Update policies for anexos_chamado_interno
DROP POLICY IF EXISTS "anexos_internos_delete" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_delete" ON public.anexos_chamado_interno FOR DELETE TO authenticated USING ((usuario_id = auth.uid()) AND (is_responsavel() OR is_admin() OR is_juridico()));

DROP POLICY IF EXISTS "anexos_internos_insert" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_insert" ON public.anexos_chamado_interno FOR INSERT TO authenticated WITH CHECK (is_responsavel() OR is_admin() OR is_juridico());

DROP POLICY IF EXISTS "anexos_internos_select" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_select" ON public.anexos_chamado_interno FOR SELECT TO authenticated USING (is_responsavel() OR is_admin() OR is_sos() OR is_juridico());

DROP POLICY IF EXISTS "anexos_internos_update" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_internos_update" ON public.anexos_chamado_interno FOR UPDATE TO authenticated USING ((usuario_id = auth.uid()) AND (is_responsavel() OR is_admin() OR is_juridico()));

-- Update policies for chamados
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados FOR SELECT TO authenticated USING ((usuario_id = auth.uid()) OR is_responsavel() OR is_admin() OR is_sos() OR is_coc() OR is_juridico());

DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados FOR UPDATE TO authenticated USING ((usuario_id = auth.uid()) OR ((is_responsavel() OR is_juridico()) AND ((responsavel_id = auth.uid()) OR (status = 'aberto'::text) OR (status = 'finalizado'::text))) OR is_admin() OR is_sos() OR is_coc());

-- Update policies for documentos
DROP POLICY IF EXISTS "documentos_delete" ON public.documentos;
CREATE POLICY "documentos_delete" ON public.documentos FOR DELETE TO authenticated USING (is_admin() OR is_responsavel() OR is_juridico());

DROP POLICY IF EXISTS "documentos_update" ON public.documentos;
CREATE POLICY "documentos_update" ON public.documentos FOR UPDATE TO authenticated USING ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_vistoriador() OR is_juridico()) WITH CHECK ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_vistoriador() OR is_juridico());

-- Update policies for formularios_espelho_danos
DROP POLICY IF EXISTS "formularios_espelho_danos_select" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_select" ON public.formularios_espelho_danos FOR SELECT TO authenticated USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.usuario_id = auth.uid()) OR (chamados.responsavel_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_juridico());

DROP POLICY IF EXISTS "formularios_espelho_danos_update" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_update" ON public.formularios_espelho_danos FOR UPDATE TO authenticated USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_juridico()) WITH CHECK ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_juridico());

-- Update policies for formularios_ido
DROP POLICY IF EXISTS "formularios_ido_select" ON public.formularios_ido;
CREATE POLICY "formularios_ido_select" ON public.formularios_ido FOR SELECT TO authenticated USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE ((chamados.usuario_id = auth.uid()) OR (chamados.responsavel_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_juridico());

DROP POLICY IF EXISTS "formularios_ido_update" ON public.formularios_ido;
CREATE POLICY "formularios_ido_update" ON public.formularios_ido FOR UPDATE TO authenticated USING ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_juridico()) WITH CHECK ((chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_juridico());

-- Update policies for historico_chamado
DROP POLICY IF EXISTS "Permitir SELECT para admin e responsáveis" ON public.historico_chamado;
CREATE POLICY "Permitir SELECT para admin e responsáveis" ON public.historico_chamado FOR SELECT TO authenticated USING ((( SELECT perfil_usuario.tipo_usuario FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = 'admin'::text) OR (( SELECT perfil_usuario.tipo_usuario FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = 'responsavel'::text) OR (( SELECT perfil_usuario.tipo_usuario FROM perfil_usuario WHERE (perfil_usuario.id = auth.uid())) = 'juridico'::text) OR (chamado_id IN ( SELECT chamados.id FROM chamados WHERE (chamados.usuario_id = auth.uid()))));

-- Seed user financeiro@viasudeste.com
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'financeiro@viasudeste.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'financeiro@viasudeste.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Financeiro Via Sudeste"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL,
      '', '', ''
    );

    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario)
    VALUES (new_user_id, 'financeiro@viasudeste.com', 'Financeiro Via Sudeste', 'juridico')
    ON CONFLICT (id) DO UPDATE SET tipo_usuario = 'juridico';
  ELSE
    UPDATE public.perfil_usuario
    SET tipo_usuario = 'juridico'
    WHERE email = 'financeiro@viasudeste.com';
  END IF;
END $$;
