DO $block$
BEGIN
  CREATE TABLE IF NOT EXISTS public.registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registro TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
END $block$;

ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registros_select_policy" ON public.registros;
CREATE POLICY "registros_select_policy" ON public.registros
  FOR SELECT TO authenticated USING (true);
