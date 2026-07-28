DO $$
DECLARE
  new_user_id uuid;
  rec record;
  new_aprovacoes jsonb;
  aprovacao text;
BEGIN
  -- 1. Seed Financeiro/DP user
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
      '{"name": "Financeiro DP"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario, departamento)
    VALUES (new_user_id, 'financeiro@viasudeste.com', 'Financeiro DP', 'dp', 'dp')
    ON CONFLICT (id) DO UPDATE SET tipo_usuario = 'dp', departamento = 'dp';
  ELSE
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'financeiro@viasudeste.com';
    UPDATE public.perfil_usuario 
    SET tipo_usuario = 'dp', departamento = 'dp'
    WHERE id = new_user_id;
  END IF;

  -- 2. Convert old string arrays to objects for aprovacoes_diretoria
  FOR rec IN SELECT id, aprovacoes_diretoria FROM public.chamados WHERE jsonb_typeof(aprovacoes_diretoria) = 'array' LOOP
    new_aprovacoes := '[]'::jsonb;
    IF jsonb_array_length(rec.aprovacoes_diretoria) > 0 AND jsonb_typeof(rec.aprovacoes_diretoria->0) = 'string' THEN
      FOR aprovacao IN SELECT jsonb_array_elements_text(rec.aprovacoes_diretoria) LOOP
        new_aprovacoes := new_aprovacoes || jsonb_build_object(
          'usuario_id', aprovacao,
          'nome_diretor', 'Diretor',
          'aprovado', true,
          'data_aprovacao', NOW()
        );
      END LOOP;
      UPDATE public.chamados SET aprovacoes_diretoria = new_aprovacoes WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
