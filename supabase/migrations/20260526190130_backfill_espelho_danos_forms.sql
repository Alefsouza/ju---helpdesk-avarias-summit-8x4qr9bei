DO $$
DECLARE
  rec RECORD;
  v_form_id UUID;
BEGIN
  FOR rec IN 
    SELECT * FROM public.documentos 
    WHERE tipo_documento = 'Espelho de Danos' 
      AND formulario_id IS NULL
  LOOP
    -- Verifica se já existe um formulário para este chamado
    IF rec.chamado_id IS NOT NULL THEN
      SELECT id INTO v_form_id 
      FROM public.formularios_espelho_danos 
      WHERE chamado_id = rec.chamado_id 
      LIMIT 1;
    ELSE
      v_form_id := NULL;
    END IF;

    -- Se não existir, cria um baseado nos dados do documento
    IF v_form_id IS NULL THEN
      v_form_id := gen_random_uuid();
      INSERT INTO public.formularios_espelho_danos (
        id, chamado_id, numero_os, garagem, data, horario, ocorrencia,
        linha, numero_carro, descricao_danos, registro_vistoriador,
        nome_vistoriador, registro_motorista, nome_motorista
      ) VALUES (
        v_form_id, rec.chamado_id, rec.numero_os, rec.garagem, rec.data,
        rec.horario, rec.ocorrencia, rec.linha, rec.numero_carro,
        rec.descricao_danos, rec.registro_responsavel, rec.nome_responsavel,
        rec.registro_motorista, rec.nome_motorista
      );
    END IF;

    -- Atualiza o documento vinculando ao formulario
    UPDATE public.documentos 
    SET formulario_id = v_form_id 
    WHERE id = rec.id;
  END LOOP;
END $$;
