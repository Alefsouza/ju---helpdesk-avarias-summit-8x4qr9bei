-- Seed Maria Rodrigues user (Jurídico department with special visibility)
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'maria.rodrigues@viasudeste.com') THEN
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
      'maria.rodrigues@viasudeste.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Maria Rodrigues"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario, ativo)
    VALUES (new_user_id, 'maria.rodrigues@viasudeste.com', 'Maria Rodrigues', 'juridico', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Allow Maria Rodrigues to SELECT all chamados where status_juridico IS NOT NULL
-- (Jurídico department tickets), regardless of responsavel_id or usuario_id.
DROP POLICY IF EXISTS "maria_juridico_select_all" ON public.chamados;
CREATE POLICY "maria_juridico_select_all" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    status_juridico IS NOT NULL
    AND auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'maria.rodrigues@viasudeste.com'
    )
  );

-- Allow Maria Rodrigues to UPDATE those same Jurídico tickets (needed for reopen/actions)
DROP POLICY IF EXISTS "maria_juridico_update_all" ON public.chamados;
CREATE POLICY "maria_juridico_update_all" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    status_juridico IS NOT NULL
    AND auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'maria.rodrigues@viasudeste.com'
    )
  )
  WITH CHECK (
    status_juridico IS NOT NULL
    AND auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'maria.rodrigues@viasudeste.com'
    )
  );
