-- Create table for internal ticket messages
CREATE TABLE IF NOT EXISTS public.mensagens_internas_chamado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mensagens_internas_chamado ENABLE ROW LEVEL SECURITY;

-- Select policy: only admin, juridico, sinistro
DROP POLICY IF EXISTS "mensagens_internas_select" ON public.mensagens_internas_chamado;
CREATE POLICY "mensagens_internas_select" ON public.mensagens_internas_chamado
  FOR SELECT TO authenticated
  USING (is_admin() OR is_juridico() OR is_sinistro());

-- Insert policy: only admin, juridico, sinistro
DROP POLICY IF EXISTS "mensagens_internas_insert" ON public.mensagens_internas_chamado;
CREATE POLICY "mensagens_internas_insert" ON public.mensagens_internas_chamado
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_juridico() OR is_sinistro());

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mensagens_internas_chamado'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_internas_chamado;
  END IF;
END $$;

-- Index for lookups by chamado
CREATE INDEX IF NOT EXISTS idx_mensagens_internas_chamado_chamado_id
  ON public.mensagens_internas_chamado (chamado_id);
