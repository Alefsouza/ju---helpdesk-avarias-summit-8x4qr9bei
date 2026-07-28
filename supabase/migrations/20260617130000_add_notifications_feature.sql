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
      new_user_id, '00000000-0000-0000-0000-000000000000', 'financeiro@viasudeste.com',
      crypt('Skip@Pass', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Financeiro"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario)
    VALUES (new_user_id, 'financeiro@viasudeste.com', 'Financeiro', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    link TEXT,
    lida BOOLEAN NOT NULL DEFAULT false,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP POLICY IF EXISTS "notificacoes_select" ON public.notificacoes;
CREATE POLICY "notificacoes_select" ON public.notificacoes
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "notificacoes_update" ON public.notificacoes;
CREATE POLICY "notificacoes_update" ON public.notificacoes
  FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notificacoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_new_chamado()
RETURNS trigger AS $$
DECLARE
    v_admin_id UUID;
    v_short_id TEXT;
BEGIN
    v_short_id := UPPER(SPLIT_PART(NEW.id::text, '-', 1));
    FOR v_admin_id IN 
        SELECT id FROM public.perfil_usuario WHERE tipo_usuario IN ('admin', 'responsavel')
    LOOP
        IF v_admin_id != NEW.usuario_id THEN
            INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
            VALUES (v_admin_id, 'Novo Chamado: #' || v_short_id, NEW.titulo, '/dashboard/chamados/' || NEW.id);
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_chamado_notify ON public.chamados;
CREATE TRIGGER on_new_chamado_notify
AFTER INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_chamado();

CREATE OR REPLACE FUNCTION public.trg_notify_new_resposta()
RETURNS trigger AS $$
DECLARE
    v_chamado_id UUID := NEW.chamado_id;
    v_autor_id UUID := NEW.usuario_id;
    v_dono_id UUID;
    v_resp_id UUID;
    v_short_id TEXT;
BEGIN
    SELECT usuario_id, responsavel_id INTO v_dono_id, v_resp_id
    FROM public.chamados WHERE id = v_chamado_id;
    v_short_id := UPPER(SPLIT_PART(v_chamado_id::text, '-', 1));

    IF v_autor_id != v_dono_id THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_dono_id, 'Nova Resposta no Chamado #' || v_short_id, 'Você recebeu uma nova mensagem.', '/dashboard/chamados/' || v_chamado_id);
    END IF;

    IF v_resp_id IS NOT NULL AND v_autor_id != v_resp_id THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_resp_id, 'Nova Resposta no Chamado #' || v_short_id, 'O solicitante enviou uma mensagem.', '/dashboard/chamados/' || v_chamado_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_resposta_notify ON public.respostas_chamado;
CREATE TRIGGER on_new_resposta_notify
AFTER INSERT ON public.respostas_chamado
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_resposta();

CREATE OR REPLACE FUNCTION public.trg_notify_new_documento()
RETURNS trigger AS $$
DECLARE
    v_chamado_id UUID := NEW.chamado_id;
    v_dono_id UUID;
    v_resp_id UUID;
    v_current_user UUID;
    v_short_id TEXT;
BEGIN
    IF v_chamado_id IS NULL THEN
        RETURN NEW;
    END IF;
    v_current_user := auth.uid();
    SELECT usuario_id, responsavel_id INTO v_dono_id, v_resp_id
    FROM public.chamados WHERE id = v_chamado_id;
    v_short_id := UPPER(SPLIT_PART(v_chamado_id::text, '-', 1));

    IF v_current_user IS NOT NULL THEN
        IF v_current_user != v_dono_id THEN
            INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
            VALUES (v_dono_id, 'Novo Documento no Chamado #' || v_short_id, 'Um novo documento foi anexado.', '/dashboard/chamados/' || v_chamado_id);
        END IF;

        IF v_resp_id IS NOT NULL AND v_current_user != v_resp_id THEN
            INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
            VALUES (v_resp_id, 'Novo Documento no Chamado #' || v_short_id, 'Um novo documento foi anexado.', '/dashboard/chamados/' || v_chamado_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_documento_notify ON public.documentos;
CREATE TRIGGER on_new_documento_notify
AFTER INSERT ON public.documentos
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_documento();

CREATE OR REPLACE FUNCTION public.trg_notify_new_anexo()
RETURNS trigger AS $$
DECLARE
    v_chamado_id UUID := NEW.chamado_id;
    v_dono_id UUID;
    v_resp_id UUID;
    v_current_user UUID;
    v_short_id TEXT;
BEGIN
    v_current_user := auth.uid();
    SELECT usuario_id, responsavel_id INTO v_dono_id, v_resp_id
    FROM public.chamados WHERE id = v_chamado_id;
    v_short_id := UPPER(SPLIT_PART(v_chamado_id::text, '-', 1));

    IF v_current_user IS NOT NULL THEN
        IF v_current_user != v_dono_id THEN
            INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
            VALUES (v_dono_id, 'Novo Anexo no Chamado #' || v_short_id, 'Um arquivo foi anexado ao chamado.', '/dashboard/chamados/' || v_chamado_id);
        END IF;

        IF v_resp_id IS NOT NULL AND v_current_user != v_resp_id THEN
            INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
            VALUES (v_resp_id, 'Novo Anexo no Chamado #' || v_short_id, 'Um arquivo foi anexado ao chamado.', '/dashboard/chamados/' || v_chamado_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_anexo_notify ON public.anexos_chamado;
CREATE TRIGGER on_new_anexo_notify
AFTER INSERT ON public.anexos_chamado
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_anexo();

CREATE OR REPLACE FUNCTION public.trg_notify_new_anexo_interno()
RETURNS trigger AS $$
DECLARE
    v_chamado_id UUID := NEW.chamado_id;
    v_dono_id UUID;
    v_resp_id UUID;
    v_autor_id UUID := NEW.usuario_id;
    v_short_id TEXT;
BEGIN
    SELECT usuario_id, responsavel_id INTO v_dono_id, v_resp_id
    FROM public.chamados WHERE id = v_chamado_id;
    v_short_id := UPPER(SPLIT_PART(v_chamado_id::text, '-', 1));

    IF v_autor_id != v_dono_id THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_dono_id, 'Novo Anexo Interno #' || v_short_id, 'Um anexo interno foi adicionado.', '/dashboard/chamados/' || v_chamado_id);
    END IF;

    IF v_resp_id IS NOT NULL AND v_autor_id != v_resp_id THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_resp_id, 'Novo Anexo Interno #' || v_short_id, 'Um anexo interno foi adicionado.', '/dashboard/chamados/' || v_chamado_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_anexo_interno_notify ON public.anexos_chamado_interno;
CREATE TRIGGER on_new_anexo_interno_notify
AFTER INSERT ON public.anexos_chamado_interno
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_anexo_interno();
