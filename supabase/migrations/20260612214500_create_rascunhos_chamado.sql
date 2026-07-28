CREATE TABLE IF NOT EXISTS public.rascunhos_chamado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rascunhos_chamado ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_rascunhos_chamado_atualizado_em()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_rascunhos_chamado_atualizado_em_trigger ON public.rascunhos_chamado;
CREATE TRIGGER update_rascunhos_chamado_atualizado_em_trigger
  BEFORE UPDATE ON public.rascunhos_chamado
  FOR EACH ROW EXECUTE FUNCTION public.update_rascunhos_chamado_atualizado_em();

DROP POLICY IF EXISTS "rascunhos_chamado_policy" ON public.rascunhos_chamado;
CREATE POLICY "rascunhos_chamado_policy" ON public.rascunhos_chamado
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
