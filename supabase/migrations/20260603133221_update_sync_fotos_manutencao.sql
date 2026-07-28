-- Drop and recreate the trigger to ensure idempotency
DROP TRIGGER IF EXISTS on_documentos_fotos_manutencao ON public.documentos;

CREATE OR REPLACE FUNCTION public.sync_fotos_manutencao_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_usuario_id uuid;
  v_responsavel_id uuid;
  v_criador_id uuid;
  v_carro text;
  v_url text;
  v_count int;
  v_next_seq int;
  v_inserted boolean := false;
  v_nome_arquivo text;
  v_chamado_id uuid;
  v_linked_by_os boolean := false;
BEGIN
  -- Only proceed for specific document types
  IF NEW.tipo_documento NOT IN ('Vistoria', 'Espelho de Danos', 'OS de Manutenção') THEN
    RETURN NEW;
  END IF;

  -- Only proceed if there are photos
  IF NEW.fotos_manutencao IS NULL OR jsonb_typeof(NEW.fotos_manutencao) != 'array' THEN
    RETURN NEW;
  END IF;

  v_chamado_id := NEW.chamado_id;

  -- Attempt correlation via numero_os if chamado_id is null
  IF v_chamado_id IS NULL AND NEW.numero_os IS NOT NULL AND NEW.numero_os != '' THEN
    SELECT id INTO v_chamado_id
    FROM public.chamados
    WHERE numero_os = NEW.numero_os
    LIMIT 1;

    IF v_chamado_id IS NOT NULL THEN
      v_linked_by_os := true;
      -- Update the current document's chamado_id to preserve the link.
      -- This won't fire this trigger recursively because it only fires OF fotos_manutencao.
      UPDATE public.documentos 
      SET chamado_id = v_chamado_id 
      WHERE id = NEW.id;
    END IF;
  END IF;

  IF v_chamado_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Attempt to get the current user
  v_usuario_id := auth.uid();
  
  -- Get context from the ticket
  SELECT responsavel_id, usuario_id, carro INTO v_responsavel_id, v_criador_id, v_carro
  FROM public.chamados WHERE id = v_chamado_id;

  -- User ID Fallback
  IF v_usuario_id IS NULL THEN
    v_usuario_id := v_responsavel_id;
    IF v_usuario_id IS NULL THEN
      v_usuario_id := v_criador_id;
    END IF;
    IF v_usuario_id IS NULL THEN
      SELECT id INTO v_usuario_id FROM public.perfil_usuario WHERE tipo_usuario = 'admin' ORDER BY criado_em ASC LIMIT 1;
    END IF;
  END IF;

  -- If still null, we can't insert into anexos_chamado_interno (auth.users foreign key)
  IF v_usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get current count for sequence
  SELECT COUNT(*) INTO v_count 
  FROM public.anexos_chamado_interno 
  WHERE chamado_id = v_chamado_id AND nome_arquivo ILIKE 'Foto Conserto %';
  
  v_next_seq := v_count + 1;

  -- Iterate through photos
  FOR v_url IN SELECT jsonb_array_elements_text(NEW.fotos_manutencao)
  LOOP
    -- Check for duplicates
    IF NOT EXISTS (
      SELECT 1 FROM public.anexos_chamado_interno 
      WHERE chamado_id = v_chamado_id AND arquivo_url = v_url
    ) THEN
      -- Create internal attachment
      v_nome_arquivo := 'Foto Conserto ' || LPAD(v_next_seq::text, 2, '0') || ' - Carro: ' || COALESCE(NEW.numero_carro, v_carro, 'N/A');
      
      INSERT INTO public.anexos_chamado_interno (
        chamado_id, 
        usuario_id, 
        arquivo_url, 
        nome_arquivo, 
        tamanho_bytes, 
        tipo_arquivo
      )
      VALUES (
        v_chamado_id, 
        v_usuario_id, 
        v_url, 
        v_nome_arquivo, 
        0, 
        'image/jpeg'
      );
      
      v_inserted := true;
      v_next_seq := v_next_seq + 1;
    END IF;
  END LOOP;

  -- Add history if at least one photo was inserted
  IF v_inserted THEN
    IF v_linked_by_os THEN
      INSERT INTO public.historico_chamado (
        chamado_id, 
        acao, 
        usuario_id, 
        detalhes
      )
      VALUES (
        v_chamado_id, 
        'respondido', 
        v_usuario_id, 
        'Evidência de manutenção vinculada automaticamente via Número de OS: ' || NEW.numero_os
      );
    ELSE
      INSERT INTO public.historico_chamado (
        chamado_id, 
        acao, 
        usuario_id, 
        detalhes
      )
      VALUES (
        v_chamado_id, 
        'respondido', 
        v_usuario_id, 
        'Evidência de manutenção sincronizada automaticamente da OS.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_documentos_fotos_manutencao
  AFTER INSERT OR UPDATE OF fotos_manutencao ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.sync_fotos_manutencao_trigger();
