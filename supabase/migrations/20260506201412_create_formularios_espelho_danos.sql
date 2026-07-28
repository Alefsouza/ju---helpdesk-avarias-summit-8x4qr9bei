CREATE TABLE IF NOT EXISTS public.formularios_espelho_danos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  numero_os TEXT,
  garagem TEXT,
  data DATE,
  horario TIME,
  ocorrencia TEXT,
  linha TEXT,
  descricao_danos TEXT,
  registro_vistoriador TEXT,
  nome_vistoriador TEXT,
  registro_motorista TEXT,
  nome_motorista TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS formularios_espelho_danos_chamado_id_idx ON public.formularios_espelho_danos USING btree (chamado_id);

ALTER TABLE public.formularios_espelho_danos ENABLE ROW LEVEL SECURITY;

-- SELECT: usuários autenticados conseguem ver formulários do seu próprio chamado
DROP POLICY IF EXISTS "formularios_espelho_danos_select" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_select" ON public.formularios_espelho_danos
  FOR SELECT TO authenticated
  USING (
    chamado_id IN (
      SELECT id FROM public.chamados 
      WHERE usuario_id = auth.uid() OR responsavel_id = auth.uid()
    ) OR public.is_admin()
  );

-- INSERT: qualquer pessoa (sem autenticação) consegue inserir um novo formulário
DROP POLICY IF EXISTS "formularios_espelho_danos_insert" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_insert" ON public.formularios_espelho_danos
  FOR INSERT TO public
  WITH CHECK (true);

-- UPDATE: apenas o responsável do chamado consegue atualizar
DROP POLICY IF EXISTS "formularios_espelho_danos_update" ON public.formularios_espelho_danos;
CREATE POLICY "formularios_espelho_danos_update" ON public.formularios_espelho_danos
  FOR UPDATE TO authenticated
  USING (
    chamado_id IN (
      SELECT id FROM public.chamados 
      WHERE responsavel_id = auth.uid()
    )
  )
  WITH CHECK (
    chamado_id IN (
      SELECT id FROM public.chamados 
      WHERE responsavel_id = auth.uid()
    )
  );
