DO $$
BEGIN
  ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_tipo_usuario_check;
  ALTER TABLE public.perfil_usuario ADD CONSTRAINT perfil_usuario_tipo_usuario_check 
    CHECK (tipo_usuario = ANY (ARRAY['basico', 'responsavel', 'admin', 'vistoriador', 'coc']));
    
  ALTER TABLE public.chamados DROP CONSTRAINT IF EXISTS chamados_status_check;
  ALTER TABLE public.chamados ADD CONSTRAINT chamados_status_check 
    CHECK (status = ANY (ARRAY['aberto', 'em_atendimento', 'finalizado', 'Pendente', 'pendente']));
END $$;

ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS registro_motorista TEXT;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS nome_motorista TEXT;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS registro_colaborador TEXT;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS nome_colaborador TEXT;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS linha TEXT;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS local_ocorrencia TEXT;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS operacao TEXT;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('anexos', 'anexos', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'anexos');

DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
CREATE POLICY "Authenticated Uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'anexos');

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'coc@viasudeste.com') THEN
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
      'coc@viasudeste.com',
      crypt('Skip@Pass123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Usuário COC Teste"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario)
    VALUES (new_user_id, 'coc@viasudeste.com', 'Usuário COC Teste', 'coc')
    ON CONFLICT (id) DO UPDATE SET tipo_usuario = 'coc';
  END IF;
END $$;
