DO $$
BEGIN
  -- Re-create the function with updated excluido_manutencao logic
  CREATE OR REPLACE FUNCTION public.liberar_veiculo_manutencao(p_id uuid, p_status text)
   RETURNS void
   LANGUAGE plpgsql
   SECURITY DEFINER
  AS $func$
  BEGIN
    IF p_status = 'Liberado (Sem Pendências)' OR p_status = 'Liberado' THEN
      UPDATE public.documentos
      SET excluido_manutencao = TRUE,
          status_liberacao = p_status
      WHERE id = p_id;
    ELSE
      UPDATE public.documentos
      SET excluido_manutencao = FALSE,
          status_liberacao = p_status
      WHERE id = p_id;
    END IF;
  END;
  $func$;

  -- Update existing records to reflect this new logic, keeping pendency items visible
  UPDATE public.documentos
  SET excluido_manutencao = FALSE
  WHERE status_liberacao = 'Liberado com Pendência';
END $$;
