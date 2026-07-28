CREATE INDEX IF NOT EXISTS idx_chamados_carro ON public.chamados (carro);
CREATE INDEX IF NOT EXISTS idx_chamados_data_ocorrencia ON public.chamados (data_ocorrencia);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON public.chamados (status);
