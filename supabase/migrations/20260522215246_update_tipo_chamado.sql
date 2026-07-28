DO $$
BEGIN
  -- Mapear valores antigos para os novos de forma logica
  UPDATE public.chamados 
  SET tipo_chamado = 'Acidente Interno' 
  WHERE tipo_chamado = 'Interno';

  UPDATE public.chamados 
  SET tipo_chamado = 'Colisão com vítima' 
  WHERE tipo_chamado = 'Vítima';

  UPDATE public.chamados 
  SET tipo_chamado = 'Avaria' 
  WHERE tipo_chamado = 'Externo';

  -- Limpar tipos de chamado que não estão na nova lista, mas mantendo a excessão para OS de Manutenção
  UPDATE public.chamados
  SET tipo_chamado = NULL
  WHERE tipo_chamado IS NOT NULL 
    AND tipo_chamado NOT IN (
      'Acidente Interno',
      'Atropelamento',
      'Avaria',
      'Colisão com vítima',
      'Colisão sem vítima',
      'Queda do usuário',
      'Vandalismo sem vítima',
      'OS de Manutenção'
    );
END $$;
