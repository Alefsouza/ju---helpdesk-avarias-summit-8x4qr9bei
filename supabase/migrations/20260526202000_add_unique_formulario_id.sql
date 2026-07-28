-- Adicionar constraint UNIQUE para formulario_id na tabela documentos para evitar duplicidades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documentos_formulario_id_key'
  ) THEN
    -- Limpar possíveis duplicidades antes de criar a constraint (manter o mais recente)
    DELETE FROM public.documentos a USING (
      SELECT MAX(ctid) as max_ctid, formulario_id
      FROM public.documentos 
      WHERE formulario_id IS NOT NULL
      GROUP BY formulario_id HAVING COUNT(*) > 1
    ) b
    WHERE a.formulario_id = b.formulario_id 
    AND a.ctid <> b.max_ctid;

    ALTER TABLE public.documentos ADD CONSTRAINT documentos_formulario_id_key UNIQUE (formulario_id);
  END IF;
END $$;
