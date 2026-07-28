CREATE OR REPLACE FUNCTION public.remover_foto_manutencao(p_documento_id uuid, p_foto_url text, p_usuario_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chamado_id uuid;
  v_admin_id uuid;
BEGIN
  -- 1. Get the chamado_id
  SELECT chamado_id INTO v_chamado_id
  FROM public.documentos
  WHERE id = p_documento_id;

  -- 2. Update the document by removing the specific URL from the JSONB array
  UPDATE public.documentos
  SET fotos_manutencao = COALESCE(fotos_manutencao, '[]'::jsonb) - p_foto_url,
      atualizado_em = NOW()
  WHERE id = p_documento_id;

  -- 3. Add history if chamado_id exists
  IF v_chamado_id IS NOT NULL THEN
    -- Determine user for audit
    IF p_usuario_id IS NOT NULL THEN
      v_admin_id := p_usuario_id;
    ELSE
      -- Fallback to system/admin user
      SELECT id INTO v_admin_id 
      FROM public.perfil_usuario 
      WHERE tipo_usuario = 'admin' 
      ORDER BY criado_em ASC 
      LIMIT 1;

      IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id 
        FROM public.perfil_usuario 
        WHERE tipo_usuario = 'responsavel' 
        ORDER BY criado_em ASC 
        LIMIT 1;
      END IF;
    END IF;

    IF v_admin_id IS NOT NULL THEN
      INSERT INTO public.historico_chamado (
        chamado_id,
        acao,
        usuario_id,
        detalhes
      ) VALUES (
        v_chamado_id,
        'respondido',
        v_admin_id,
        'Evidência de manutenção (foto) removida da OS.'
      );
    END IF;
  END IF;
END;
$$;
