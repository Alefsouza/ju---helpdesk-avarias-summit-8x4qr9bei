DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chamados' AND column_name = 'cargo') THEN
    ALTER TABLE public.chamados RENAME COLUMN cargo TO carro;
  END IF;
END $$;
