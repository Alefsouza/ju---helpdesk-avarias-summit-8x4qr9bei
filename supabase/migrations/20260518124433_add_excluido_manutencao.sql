ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS excluido_manutencao BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.ocultar_documento_manutencao(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.documentos
  SET excluido_manutencao = TRUE
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ocultar_documento_manutencao(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.ocultar_documento_manutencao(uuid) TO authenticated;
