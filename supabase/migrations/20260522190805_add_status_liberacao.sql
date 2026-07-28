DO $$
BEGIN
    ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS status_liberacao TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to add status_liberacao column: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.liberar_veiculo_manutencao(p_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.documentos
  SET excluido_manutencao = TRUE,
      status_liberacao = p_status
  WHERE id = p_id;
END;
$function$;
