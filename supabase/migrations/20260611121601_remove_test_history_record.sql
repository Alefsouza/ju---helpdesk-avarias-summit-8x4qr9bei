DO $$
BEGIN
  DELETE FROM public.historico_chamado
  WHERE detalhes ILIKE '%Vale gerado com sucesso no valor de R$ 900,00 parcelado em 3x.%'
    AND usuario_id IN (
      SELECT id FROM public.perfil_usuario WHERE nome_completo ILIKE '%Raquel Leylane%'
    );
END $$;
