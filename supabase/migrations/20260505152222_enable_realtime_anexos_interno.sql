DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'anexos_chamado_interno'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.anexos_chamado_interno;
  END IF;
END $$;
