ALTER TABLE public.parcelas_vales
ADD COLUMN IF NOT EXISTS aprovado_diretoria boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS aprovado_em timestamp with time zone;

UPDATE public.parcelas_vales
SET aprovado_diretoria = true,
    aprovado_em = parcelas_vales.criado_em
FROM public.chamados
WHERE parcelas_vales.chamado_id = chamados.id
AND chamados.status_aprovacao = 'aprovado'
AND parcelas_vales.aprovado_diretoria = false;
