CREATE TABLE IF NOT EXISTS public.formularios_ido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
    protocolo_ido TEXT,
    colaborador_nome TEXT,
    colaborador_registro TEXT,
    testemunha_1_nome TEXT,
    testemunha_1_endereco TEXT,
    testemunha_1_sg TEXT,
    testemunha_1_telefone TEXT,
    testemunha_2_nome TEXT,
    testemunha_2_endereco TEXT,
    testemunha_2_sg TEXT,
    testemunha_2_telefone TEXT,
    testemunha_3_nome TEXT,
    testemunha_3_endereco TEXT,
    testemunha_3_sg TEXT,
    testemunha_3_telefone TEXT,
    assinatura_base64 TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS formularios_ido_chamado_id_idx ON public.formularios_ido(chamado_id);

ALTER TABLE public.formularios_ido ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "formularios_ido_select" ON public.formularios_ido;
CREATE POLICY "formularios_ido_select" ON public.formularios_ido
    FOR SELECT TO authenticated
    USING (
        chamado_id IN (
            SELECT id FROM public.chamados 
            WHERE usuario_id = auth.uid() OR responsavel_id = auth.uid()
        ) OR public.is_admin()
    );

DROP POLICY IF EXISTS "formularios_ido_insert" ON public.formularios_ido;
CREATE POLICY "formularios_ido_insert" ON public.formularios_ido
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "formularios_ido_update" ON public.formularios_ido;
CREATE POLICY "formularios_ido_update" ON public.formularios_ido
    FOR UPDATE TO authenticated
    USING (
        chamado_id IN (
            SELECT id FROM public.chamados 
            WHERE responsavel_id = auth.uid()
        )
    ) WITH CHECK (
        chamado_id IN (
            SELECT id FROM public.chamados 
            WHERE responsavel_id = auth.uid()
        )
    );
