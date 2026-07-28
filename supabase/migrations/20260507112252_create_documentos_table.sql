CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('IDO', 'Espelho de Danos')),
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  registro_responsavel TEXT,
  nome_responsavel TEXT,
  cargo_responsavel TEXT,
  chamado_id UUID REFERENCES public.chamados(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- SELECT policy: authenticated users can see all documents
DROP POLICY IF EXISTS "documentos_select" ON public.documentos;
CREATE POLICY "documentos_select" ON public.documentos
  FOR SELECT TO authenticated USING (true);

-- INSERT policy: anyone (including anon) can insert new documents
DROP POLICY IF EXISTS "documentos_insert" ON public.documentos;
CREATE POLICY "documentos_insert" ON public.documentos
  FOR INSERT TO public WITH CHECK (true);

-- UPDATE policy: only the responsible for the ticket can update
DROP POLICY IF EXISTS "documentos_update" ON public.documentos;
CREATE POLICY "documentos_update" ON public.documentos
  FOR UPDATE TO authenticated
  USING (
    chamado_id IN (
      SELECT id FROM public.chamados WHERE responsavel_id = auth.uid()
    )
  )
  WITH CHECK (
    chamado_id IN (
      SELECT id FROM public.chamados WHERE responsavel_id = auth.uid()
    )
  );

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS documentos_tipo_documento_idx ON public.documentos USING btree (tipo_documento);
CREATE INDEX IF NOT EXISTS documentos_registro_responsavel_idx ON public.documentos USING btree (registro_responsavel);
CREATE INDEX IF NOT EXISTS documentos_chamado_id_idx ON public.documentos USING btree (chamado_id);

-- Trigger to automatically update atualizado_em
CREATE OR REPLACE FUNCTION public.update_documentos_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_documentos_atualizado_em_trigger ON public.documentos;
CREATE TRIGGER update_documentos_atualizado_em_trigger
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_documentos_atualizado_em();
