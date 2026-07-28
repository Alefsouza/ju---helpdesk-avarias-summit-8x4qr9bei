DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documentos' AND column_name='garagem') THEN
      ALTER TABLE public.documentos ADD COLUMN garagem TEXT;
      ALTER TABLE public.documentos ADD COLUMN data DATE;
      ALTER TABLE public.documentos ADD COLUMN horario TIME;
      ALTER TABLE public.documentos ADD COLUMN ocorrencia TEXT;
      ALTER TABLE public.documentos ADD COLUMN linha TEXT;
      ALTER TABLE public.documentos ADD COLUMN descricao_danos TEXT;
  END IF;
END $$;

ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_tipo_documento_check;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_tipo_documento_check CHECK (tipo_documento = ANY (ARRAY['IDO'::text, 'Espelho de Danos'::text, 'Vistoria'::text]));

INSERT INTO storage.buckets (id, name, public) VALUES ('vistorias', 'vistorias', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access vistorias" ON storage.objects;
CREATE POLICY "Public Access vistorias" ON storage.objects FOR SELECT USING (bucket_id = 'vistorias');

DROP POLICY IF EXISTS "Auth Insert vistorias" ON storage.objects;
CREATE POLICY "Auth Insert vistorias" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vistorias' AND auth.role() = 'authenticated');
