-- Seed Daniel Brotas user (Jurídico department, restricted to Cobrança de Terceiros view)
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'daniel.brotas@viasudeste.com') THEN
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
      'daniel.brotas@viasudeste.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Daniel Brotas"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario, ativo)
    VALUES (new_user_id, 'daniel.brotas@viasudeste.com', 'Daniel Brotas', 'juridico', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Allow Daniel Brotas to SELECT all chamados where status_juridico IS NOT NULL
-- (same visibility as Maria Rodrigues for Cobrança de Terceiros)
DROP POLICY IF EXISTS "daniel_brotas_select_all" ON public.chamados;
CREATE POLICY "daniel_brotas_select_all" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    status_juridico IS NOT NULL
    AND auth.jwt() ->> 'email' = 'daniel.brotas@viasudeste.com'
  );

-- Allow Daniel Brotas to UPDATE those same Jurídico tickets (needed for reopen/actions)
DROP POLICY IF EXISTS "daniel_brotas_update_all" ON public.chamados;
CREATE POLICY "daniel_brotas_update_all" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    status_juridico IS NOT NULL
    AND auth.jwt() ->> 'email' = 'daniel.brotas@viasudeste.com'
  )
  WITH CHECK (
    status_juridico IS NOT NULL
    AND auth.jwt() ->> 'email' = 'daniel.brotas@viasudeste.com'
  );
