-- Tables
CREATE TABLE IF NOT EXISTS public.perfil_usuario (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  whatsapp TEXT,
  endereco TEXT,
  tipo_usuario TEXT NOT NULL DEFAULT 'basico' CHECK (tipo_usuario IN ('basico', 'responsavel', 'admin')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  assunto TEXT NOT NULL,
  descricao TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_atendimento', 'finalizado')),
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.respostas_chamado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.anexos_chamado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  url_arquivo TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL CHECK (tipo_arquivo IN ('audio', 'video', 'imagem', 'pdf')),
  tamanho_mb NUMERIC NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.historico_chamado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  acao TEXT NOT NULL CHECK (acao IN ('criado', 'atribuido', 'respondido', 'finalizado', 'deletado')),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  detalhes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Functions
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_responsavel() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'responsavel'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'basico'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Enable
ALTER TABLE public.perfil_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_chamado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos_chamado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_chamado ENABLE ROW LEVEL SECURITY;

-- Policies
-- perfil_usuario
DROP POLICY IF EXISTS "perfil_select" ON public.perfil_usuario;
CREATE POLICY "perfil_select" ON public.perfil_usuario
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "perfil_update" ON public.perfil_usuario;
CREATE POLICY "perfil_update" ON public.perfil_usuario
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- chamados
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados
  FOR SELECT TO authenticated USING (
    usuario_id = auth.uid() OR 
    (public.is_responsavel() AND (responsavel_id = auth.uid() OR status = 'aberto')) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "chamados_insert" ON public.chamados;
CREATE POLICY "chamados_insert" ON public.chamados
  FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados
  FOR UPDATE TO authenticated USING (
    usuario_id = auth.uid() OR 
    (public.is_responsavel() AND (responsavel_id = auth.uid() OR status = 'aberto')) OR
    public.is_admin()
  );

-- respostas_chamado
DROP POLICY IF EXISTS "respostas_select" ON public.respostas_chamado;
CREATE POLICY "respostas_select" ON public.respostas_chamado
  FOR SELECT TO authenticated USING (
    usuario_id = auth.uid() OR
    chamado_id IN (SELECT id FROM public.chamados)
  );

DROP POLICY IF EXISTS "respostas_insert" ON public.respostas_chamado;
CREATE POLICY "respostas_insert" ON public.respostas_chamado
  FOR INSERT TO authenticated WITH CHECK (
    usuario_id = auth.uid() AND
    chamado_id IN (SELECT id FROM public.chamados)
  );

-- anexos_chamado
DROP POLICY IF EXISTS "anexos_select" ON public.anexos_chamado;
CREATE POLICY "anexos_select" ON public.anexos_chamado
  FOR SELECT TO authenticated USING (
    chamado_id IN (SELECT id FROM public.chamados)
  );

DROP POLICY IF EXISTS "anexos_insert" ON public.anexos_chamado;
CREATE POLICY "anexos_insert" ON public.anexos_chamado
  FOR INSERT TO authenticated WITH CHECK (
    chamado_id IN (SELECT id FROM public.chamados)
  );

-- historico_chamado
DROP POLICY IF EXISTS "historico_select" ON public.historico_chamado;
CREATE POLICY "historico_select" ON public.historico_chamado
  FOR SELECT TO authenticated USING (
    public.is_admin() OR
    chamado_id IN (SELECT id FROM public.chamados WHERE usuario_id = auth.uid())
  );

-- Seed Data
DO $$
DECLARE
  admin_id UUID := gen_random_uuid();
  basic_id UUID := gen_random_uuid();
  resp_id UUID := gen_random_uuid();
BEGIN
  -- Admin
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@helpdesk.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token, phone
    ) VALUES (
      admin_id, '00000000-0000-0000-0000-000000000000', 'admin@helpdesk.com',
      crypt('12345678', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"full_name": "Administrador"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', '', '', '', NULL
    );
    
    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario)
    VALUES (admin_id, 'admin@helpdesk.com', 'Administrador', 'admin')
    ON CONFLICT (id) DO UPDATE SET tipo_usuario = 'admin';
  END IF;

  -- Básico
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'usuario@helpdesk.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token, phone
    ) VALUES (
      basic_id, '00000000-0000-0000-0000-000000000000', 'usuario@helpdesk.com',
      crypt('12345678', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"full_name": "Usuário Básico"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', '', '', '', NULL
    );
    
    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario)
    VALUES (basic_id, 'usuario@helpdesk.com', 'Usuário Básico', 'basico')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Responsável
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'responsavel@helpdesk.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token, phone
    ) VALUES (
      resp_id, '00000000-0000-0000-0000-000000000000', 'responsavel@helpdesk.com',
      crypt('12345678', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"full_name": "Técnico Responsável"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', '', '', '', NULL
    );
    
    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario)
    VALUES (resp_id, 'responsavel@helpdesk.com', 'Técnico Responsável', 'responsavel')
    ON CONFLICT (id) DO UPDATE SET tipo_usuario = 'responsavel';
  END IF;
END $$;
