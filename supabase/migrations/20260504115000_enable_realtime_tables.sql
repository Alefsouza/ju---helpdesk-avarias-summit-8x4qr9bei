DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.respostas_chamado;
  EXCEPTION WHEN OTHERS THEN END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_chamado;
  EXCEPTION WHEN OTHERS THEN END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados;
  EXCEPTION WHEN OTHERS THEN END;
END $$;
