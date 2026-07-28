ALTER TABLE public.parcelas_vales ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo';

CREATE INDEX IF NOT EXISTS idx_parcelas_vales_status ON public.parcelas_vales (status);
