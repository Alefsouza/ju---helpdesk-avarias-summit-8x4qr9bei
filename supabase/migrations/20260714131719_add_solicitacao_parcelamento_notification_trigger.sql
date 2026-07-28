CREATE OR REPLACE FUNCTION public.trg_notify_new_solicitacao_parcelamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
    v_short_id TEXT;
BEGIN
    v_short_id := UPPER(SPLIT_PART(NEW.chamado_id::text, '-', 1));

    FOR v_admin_id IN
        SELECT id FROM public.perfil_usuario
        WHERE email IN ('alex.fontes@viasudeste.com', 'financeiro@viasudeste.com')
          AND ativo = true
    LOOP
        INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link, lida)
        VALUES (
            v_admin_id,
            'Nova Solicitação de Parcelamento',
            'Uma nova solicitação de parcelamento para o chamado #' || v_short_id || ' aguarda sua autorização.',
            '/dashboard/autorizar-parcelas',
            false
        );
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_solicitacao_parcelamento ON public.solicitacoes_parcelamento;
CREATE TRIGGER on_new_solicitacao_parcelamento
  AFTER INSERT ON public.solicitacoes_parcelamento
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_solicitacao_parcelamento();
