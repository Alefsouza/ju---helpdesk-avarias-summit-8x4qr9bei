DO $$
BEGIN
  -- Create RPC for appending maintenance photos and auditing
  CREATE OR REPLACE FUNCTION public.anexar_foto_manutencao(p_documento_id uuid, p_foto_url text, p_usuario_id uuid DEFAULT NULL)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
  DECLARE
    v_chamado_id uuid;
    v_admin_id uuid;
    v_fotos jsonb;
  BEGIN
    -- 1. Get the current fotos and chamado_id
    SELECT chamado_id, fotos_manutencao INTO v_chamado_id, v_fotos
    FROM public.documentos
    WHERE id = p_documento_id;

    IF v_fotos IS NULL THEN
      v_fotos := '[]'::jsonb;
    END IF;
    
    -- Append new photo URL
    v_fotos := v_fotos || jsonb_build_array(p_foto_url);

    -- 2. Update the document
    UPDATE public.documentos
    SET fotos_manutencao = v_fotos,
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
          'Evidência de manutenção (foto) anexada à OS.'
        );
      END IF;
    END IF;
  END;
  $function$;
END $$;
