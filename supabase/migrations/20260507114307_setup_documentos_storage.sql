DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('documentos', 'documentos', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "Permitir upload público para documentos" ON storage.objects;
CREATE POLICY "Permitir upload público para documentos"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'documentos');

DROP POLICY IF EXISTS "Permitir leitura pública para documentos" ON storage.objects;
CREATE POLICY "Permitir leitura pública para documentos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documentos');
