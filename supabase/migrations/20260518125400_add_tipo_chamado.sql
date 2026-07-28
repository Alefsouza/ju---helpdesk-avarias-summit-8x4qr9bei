DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'chamados' AND column_name = 'tipo_chamado'
  ) THEN
    ALTER TABLE public.chamados ADD COLUMN tipo_chamado TEXT;
  END IF;
END $$;
