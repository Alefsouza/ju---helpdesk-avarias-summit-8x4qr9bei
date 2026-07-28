DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find the specific test user
  SELECT id INTO v_user_id 
  FROM public.perfil_usuario 
  WHERE nome_completo ILIKE '%Raquel Leylane%' 
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Delete the specific history record
    DELETE FROM public.historico_chamado
    WHERE usuario_id = v_user_id
      AND detalhes ILIKE 'Vale gerado com sucesso no valor de%675%parcelado em 2x.';
  END IF;
END $$;
