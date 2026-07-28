-- Ensure documentos bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to upload to documentos
DROP POLICY IF EXISTS "public_upload_documentos" ON storage.objects;
CREATE POLICY "public_upload_documentos" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'documentos');

-- Allow anyone to read from documentos
DROP POLICY IF EXISTS "public_read_documentos" ON storage.objects;
CREATE POLICY "public_read_documentos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'documentos');
