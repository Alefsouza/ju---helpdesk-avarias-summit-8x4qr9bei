-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('anexos_chamados_interno', 'anexos_chamados_interno', false)
ON CONFLICT (id) DO NOTHING;

-- Allow public inserts to the bucket
DROP POLICY IF EXISTS "Permitir upload publico de boletins" ON storage.objects;
CREATE POLICY "Permitir upload publico de boletins"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'anexos_chamados_interno');

DROP POLICY IF EXISTS "Permitir leitura publica de boletins" ON storage.objects;
CREATE POLICY "Permitir leitura publica de boletins"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'anexos_chamados_interno');

-- Create RPC to insert the file and notify
CREATE OR REPLACE FUNCTION public.registrar_boletim_ido(
  p_chamado_id uuid,
  p_nome_arquivo text,
  p_arquivo_url text,
  p_tamanho_bytes integer
) RETURNS void AS $$
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
    'Boletim Eletrônico IDO preenchido e anexado com sucesso.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow execution by anonymous users
GRANT EXECUTE ON FUNCTION public.registrar_boletim_ido(uuid, text, text, integer) TO public;
GRANT EXECUTE ON FUNCTION public.registrar_boletim_ido(uuid, text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.registrar_boletim_ido(uuid, text, text, integer) TO authenticated;
