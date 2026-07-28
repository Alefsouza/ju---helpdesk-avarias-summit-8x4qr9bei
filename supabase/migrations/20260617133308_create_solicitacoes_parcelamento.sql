CREATE TABLE IF NOT EXISTS public.solicitacoes_parcelamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registro TEXT,
  nome TEXT,
  valor_orcamento NUMERIC NOT NULL,
  quantidade_parcelas INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_parcelamento_chamado_id ON public.solicitacoes_parcelamento(chamado_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_parcelamento_status ON public.solicitacoes_parcelamento(status);

-- Enable RLS
ALTER TABLE public.solicitacoes_parcelamento ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can see if they created the request, if they are related to the ticket, or if they have admin/director roles
DROP POLICY IF EXISTS "solicitacoes_parcelamento_select" ON public.solicitacoes_parcelamento;
CREATE POLICY "solicitacoes_parcelamento_select" ON public.solicitacoes_parcelamento
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid() OR
    chamado_id IN (SELECT id FROM public.chamados WHERE responsavel_id = auth.uid() OR usuario_id = auth.uid()) OR
    is_admin() OR
    (SELECT departamento FROM public.perfil_usuario WHERE id = auth.uid()) = 'Diretoria' OR
    (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) = 'dp' OR
    (auth.jwt() ->> 'email' = 'alex.fontes@viasudeste.com')
  );

-- INSERT policy: Any authenticated user can create a request
DROP POLICY IF EXISTS "solicitacoes_parcelamento_insert" ON public.solicitacoes_parcelamento;
CREATE POLICY "solicitacoes_parcelamento_insert" ON public.solicitacoes_parcelamento
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE policy: Only admins, directors or specific authorized managers can update the status
DROP POLICY IF EXISTS "solicitacoes_parcelamento_update" ON public.solicitacoes_parcelamento;
CREATE POLICY "solicitacoes_parcelamento_update" ON public.solicitacoes_parcelamento
  FOR UPDATE TO authenticated
  USING (
    is_admin() OR
    (SELECT departamento FROM public.perfil_usuario WHERE id = auth.uid()) = 'Diretoria' OR
    (auth.jwt() ->> 'email' = 'alex.fontes@viasudeste.com')
  )
  WITH CHECK (
    is_admin() OR
    (SELECT departamento FROM public.perfil_usuario WHERE id = auth.uid()) = 'Diretoria' OR
    (auth.jwt() ->> 'email' = 'alex.fontes@viasudeste.com')
  );

-- Trigger to automatically update `atualizado_em`
CREATE OR REPLACE FUNCTION public.update_solicitacoes_parcelamento_atualizado_em()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_solicitacoes_parcelamento_atualizado_em_trigger ON public.solicitacoes_parcelamento;
CREATE TRIGGER update_solicitacoes_parcelamento_atualizado_em_trigger
  BEFORE UPDATE ON public.solicitacoes_parcelamento
  FOR EACH ROW EXECUTE FUNCTION public.update_solicitacoes_parcelamento_atualizado_em();
