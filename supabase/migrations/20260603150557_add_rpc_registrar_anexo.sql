CREATE OR REPLACE FUNCTION public.registrar_anexo_interno_publico(
  p_chamado_id uuid,
  p_nome_arquivo text,
  p_arquivo_url text,
  p_tamanho_bytes integer,
  p_tipo_arquivo text DEFAULT 'application/pdf',
  p_detalhes_historico text DEFAULT 'Anexo incluído com sucesso.'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_responsavel_id uuid;
  v_usuario_id uuid;
  v_alvo_id uuid;
BEGIN
  SELECT responsavel_id, usuario_id INTO v_responsavel_id, v_usuario_id
  FROM public.chamados
  WHERE id = p_chamado_id;

  v_alvo_id := COALESCE(v_responsavel_id, v_usuario_id);

  IF v_alvo_id IS NULL THEN
    RAISE EXCEPTION 'Chamado não encontrado ou sem usuários vinculados';
  END IF;

  INSERT INTO public.anexos_chamado_interno (
    chamado_id,
    usuario_id,
    nome_arquivo,
    arquivo_url,
    tipo_arquivo,
    tamanho_bytes
  ) VALUES (
    p_chamado_id,
    v_alvo_id,
    p_nome_arquivo,
    p_arquivo_url,
    p_tipo_arquivo,
    p_tamanho_bytes
  );

  INSERT INTO public.historico_chamado (
    chamado_id,
    usuario_id,
    acao,
    detalhes
  ) VALUES (
    p_chamado_id,
    v_alvo_id,
    'respondido',
    p_detalhes_historico
  );
END;
$$;
