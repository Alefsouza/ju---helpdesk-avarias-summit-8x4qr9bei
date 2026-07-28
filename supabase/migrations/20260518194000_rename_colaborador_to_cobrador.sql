DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chamados' AND column_name='registro_colaborador') THEN
    ALTER TABLE public.chamados RENAME COLUMN registro_colaborador TO registro_cobrador;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chamados' AND column_name='nome_colaborador') THEN
    ALTER TABLE public.chamados RENAME COLUMN nome_colaborador TO nome_cobrador;
  END IF;
END $$;
