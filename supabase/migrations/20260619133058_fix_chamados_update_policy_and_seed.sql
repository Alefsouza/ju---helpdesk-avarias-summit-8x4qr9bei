-- 1. Create an additive UPDATE policy to ensure authorized users can update chamados
DROP POLICY IF EXISTS "permitir_atualizacao_chamados_suporte" ON public.chamados;
CREATE POLICY "permitir_atualizacao_chamados_suporte" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = usuario_id OR
    auth.uid() = responsavel_id OR
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'secretaria_tecnica', 'responsavel', 'sinistro', 'juridico', 'dp', 'coc')
    )
  )
  WITH CHECK (true);

-- Ensure `historico_chamado` can also be inserted properly when a ticket is finalized
DROP POLICY IF EXISTS "permitir_insert_historico_chamado" ON public.historico_chamado;
CREATE POLICY "permitir_insert_historico_chamado" ON public.historico_chamado
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. Seed Financeiro User
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
      '{"name": "Financeiro"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario, ativo)
    VALUES (new_user_id, 'financeiro@viasudeste.com', 'Financeiro', 'admin', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
