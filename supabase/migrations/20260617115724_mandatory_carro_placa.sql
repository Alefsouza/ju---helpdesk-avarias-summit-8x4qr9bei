DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chamados' AND column_name = 'carro') THEN
    UPDATE public.chamados SET carro = 'NAO_INF' WHERE carro IS NULL OR carro = '';
    ALTER TABLE public.chamados ALTER COLUMN carro SET NOT NULL;
  END IF;
END $$;
