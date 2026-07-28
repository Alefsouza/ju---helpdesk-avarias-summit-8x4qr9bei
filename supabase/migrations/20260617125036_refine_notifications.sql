CREATE OR REPLACE FUNCTION public.trg_notify_new_chamado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
    v_admin record;
    v_short_id TEXT;
BEGIN
    v_short_id := UPPER(SPLIT_PART(NEW.id::text, '-', 1));
    FOR v_admin IN 
        SELECT id, garagem FROM public.perfil_usuario WHERE tipo_usuario IN ('admin', 'responsavel')
    LOOP
        -- Notifica admins e responsáveis se a garagem do ticket for nula ou se bater com a garagem do admin,
        -- e garante que o criador não receba notificação de seu próprio chamado.
        IF v_admin.id != NEW.usuario_id AND (NEW.garagem IS NULL OR v_admin.garagem = NEW.garagem) THEN
            INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
            VALUES (v_admin.id, 'Novo Chamado: #' || v_short_id, NEW.titulo, '/dashboard/chamados/' || NEW.id);
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_new_resposta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
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

    -- Notifica o criador (se não foi ele quem respondeu)
    IF v_autor_id IS NULL OR v_autor_id != v_dono_id THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_dono_id, 'Nova Resposta no Chamado #' || v_short_id, 'Você recebeu uma nova mensagem.', '/dashboard/chamados/' || v_chamado_id);
    END IF;

    -- Notifica o responsável (se existir e se não foi ele quem respondeu)
    IF v_resp_id IS NOT NULL AND (v_autor_id IS NULL OR v_autor_id != v_resp_id) THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_resp_id, 'Nova Resposta no Chamado #' || v_short_id, 'O solicitante enviou uma mensagem.', '/dashboard/chamados/' || v_chamado_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_new_anexo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
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

    IF v_current_user IS NULL OR v_current_user != v_dono_id THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_dono_id, 'Novo Anexo no Chamado #' || v_short_id, 'Um arquivo foi anexado ao chamado.', '/dashboard/chamados/' || v_chamado_id);
    END IF;

    IF v_resp_id IS NOT NULL AND (v_current_user IS NULL OR v_current_user != v_resp_id) THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_resp_id, 'Novo Anexo no Chamado #' || v_short_id, 'Um arquivo foi anexado ao chamado.', '/dashboard/chamados/' || v_chamado_id);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_new_anexo_interno()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
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

    IF v_autor_id IS NULL OR v_autor_id != v_dono_id THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_dono_id, 'Novo Anexo Interno #' || v_short_id, 'Um anexo interno foi adicionado.', '/dashboard/chamados/' || v_chamado_id);
    END IF;

    IF v_resp_id IS NOT NULL AND (v_autor_id IS NULL OR v_autor_id != v_resp_id) THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_resp_id, 'Novo Anexo Interno #' || v_short_id, 'Um anexo interno foi adicionado.', '/dashboard/chamados/' || v_chamado_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_new_documento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
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

    IF v_current_user IS NULL OR v_current_user != v_dono_id THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_dono_id, 'Novo Documento no Chamado #' || v_short_id, 'Um novo documento foi anexado.', '/dashboard/chamados/' || v_chamado_id);
    END IF;

    IF v_resp_id IS NOT NULL AND (v_current_user IS NULL OR v_current_user != v_resp_id) THEN
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
        VALUES (v_resp_id, 'Novo Documento no Chamado #' || v_short_id, 'Um novo documento foi anexado.', '/dashboard/chamados/' || v_chamado_id);
    END IF;
    
    RETURN NEW;
END;
$$;
