DO $$
BEGIN
  -- Create anexos_chamado_interno table
  CREATE TABLE IF NOT EXISTS public.anexos_chamado_interno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    arquivo_url TEXT NOT NULL,
    nome_arquivo TEXT NOT NULL,
    tamanho_bytes INTEGER NOT NULL,
    tipo_arquivo TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE public.anexos_chamado_interno ENABLE ROW LEVEL SECURITY;

  -- Create policies for anexos_chamado_interno
  DROP POLICY IF EXISTS "anexos_internos_select" ON public.anexos_chamado_interno;
  CREATE POLICY "anexos_internos_select" ON public.anexos_chamado_interno
    FOR SELECT TO authenticated USING (public.is_responsavel() OR public.is_admin());

  DROP POLICY IF EXISTS "anexos_internos_insert" ON public.anexos_chamado_interno;
  CREATE POLICY "anexos_internos_insert" ON public.anexos_chamado_interno
    FOR INSERT TO authenticated WITH CHECK (public.is_responsavel() OR public.is_admin());

  DROP POLICY IF EXISTS "anexos_internos_update" ON public.anexos_chamado_interno;
  CREATE POLICY "anexos_internos_update" ON public.anexos_chamado_interno
    FOR UPDATE TO authenticated USING (usuario_id = auth.uid() AND (public.is_responsavel() OR public.is_admin()));

  DROP POLICY IF EXISTS "anexos_internos_delete" ON public.anexos_chamado_interno;
  CREATE POLICY "anexos_internos_delete" ON public.anexos_chamado_interno
    FOR DELETE TO authenticated USING (usuario_id = auth.uid() AND (public.is_responsavel() OR public.is_admin()));

END $$;

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('anexos_chamados_interno', 'anexos_chamados_interno', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies for the bucket
DROP POLICY IF EXISTS "Permitir SELECT para admin e responsavel" ON storage.objects;
CREATE POLICY "Permitir SELECT para admin e responsavel" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'anexos_chamados_interno' AND (public.is_responsavel() OR public.is_admin()));

DROP POLICY IF EXISTS "Permitir INSERT para admin e responsavel" ON storage.objects;
CREATE POLICY "Permitir INSERT para admin e responsavel" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'anexos_chamados_interno' AND (public.is_responsavel() OR public.is_admin()));

DROP POLICY IF EXISTS "Permitir DELETE para dono do arquivo e admin/responsavel" ON storage.objects;
CREATE POLICY "Permitir DELETE para dono do arquivo e admin/responsavel" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'anexos_chamados_interno' AND auth.uid() = owner AND (public.is_responsavel() OR public.is_admin()));
