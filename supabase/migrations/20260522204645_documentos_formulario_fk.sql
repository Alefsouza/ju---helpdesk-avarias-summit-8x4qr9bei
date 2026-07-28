-- Make chamado_id nullable in formularios_espelho_danos to allow detached forms
ALTER TABLE public.formularios_espelho_danos ALTER COLUMN chamado_id DROP NOT NULL;

-- Add formulario_id to documentos to maintain relationship with the exact form
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS formulario_id UUID REFERENCES public.formularios_espelho_danos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS documentos_formulario_id_idx ON public.documentos(formulario_id);
