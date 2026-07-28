ALTER TABLE public.chamados ALTER COLUMN assunto DROP NOT NULL;
ALTER TABLE public.chamados DROP COLUMN IF EXISTS assunto;
