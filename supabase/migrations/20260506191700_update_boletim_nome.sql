DO $$
BEGIN
  UPDATE public.historico_chamado
  SET detalhes = REPLACE(detalhes, 'Boletim Eletrônico IDO', 'Boletim de Ocorrência')
  WHERE detalhes LIKE '%Boletim Eletrônico IDO%';
END $$;

CREATE OR REPLACE FUNCTION public.registrar_boletim_ido(p_chamado_id uuid, p_nome_arquivo text, p_arquivo_url text, p_tamanho_bytes integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_responsavel_id uuid;
  v_usuario_id uuid;
  v_alvo_id uuid;
BEGIN
  -- Get ticket details
  SELECT responsavel_id, usuario_id INTO v_responsavel_id, v_usuario_id
  FROM public.chamados
  WHERE id = p_chamado_id;

  -- Determine the user ID to associate the attachment with
  -- If there's a responsible, use it, otherwise fallback to the creator
  v_alvo_id := COALESCE(v_responsavel_id, v_usuario_id);

  IF v_alvo_id IS NULL THEN
    RAISE EXCEPTION 'Chamado não encontrado ou sem usuários vinculados';
  END IF;

  -- Insert into anexos_chamado_interno
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
    'application/pdf',
    p_tamanho_bytes
  );

  -- Insert notification into historico_chamado
  INSERT INTO public.historico_chamado (
    chamado_id,
    usuario_id,
    acao,
    detalhes
  ) VALUES (
    p_chamado_id,
    v_alvo_id,
    'respondido',
    'Boletim de Ocorrência preenchido e anexado com sucesso.'
  );
END;
$function$;
