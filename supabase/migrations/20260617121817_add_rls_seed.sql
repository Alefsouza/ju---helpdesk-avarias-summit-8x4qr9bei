DO $DO_BLOCK$
DECLARE
  v_user_id uuid;
BEGIN
  -- Seed user idempotent insertion
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'financeiro@viasudeste.com') THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'financeiro@viasudeste.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Financeiro"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario)
    VALUES (v_user_id, 'financeiro@viasudeste.com', 'Financeiro', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $DO_BLOCK$;

-- RLS Policies
DROP POLICY IF EXISTS "documentos_select_admin_responsavel" ON public.documentos;
CREATE POLICY "documentos_select_admin_responsavel" ON public.documentos
  FOR SELECT TO authenticated
  USING (
    (public.is_admin() OR public.is_responsavel())
    AND chamado_id IN (SELECT id FROM public.chamados)
  );

DROP POLICY IF EXISTS "anexos_chamado_select_admin_responsavel" ON public.anexos_chamado;
CREATE POLICY "anexos_chamado_select_admin_responsavel" ON public.anexos_chamado
  FOR SELECT TO authenticated
  USING (
    (public.is_admin() OR public.is_responsavel())
    AND chamado_id IN (SELECT id FROM public.chamados)
  );

DROP POLICY IF EXISTS "anexos_interno_select_admin_responsavel" ON public.anexos_chamado_interno;
CREATE POLICY "anexos_interno_select_admin_responsavel" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (
    (public.is_admin() OR public.is_responsavel())
    AND chamado_id IN (SELECT id FROM public.chamados)
  );
