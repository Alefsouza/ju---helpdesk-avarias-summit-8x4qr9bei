-- Add a SELECT policy on the anexos_chamados_interno storage bucket so that
-- Daniel Brotas can read/download any object in the bucket.
-- Uses auth.jwt() ->> 'email' to match the user's email in the JWT token.

DROP POLICY IF EXISTS "daniel_brotas_select_anexos_internos_storage" ON storage.objects;
CREATE POLICY "daniel_brotas_select_anexos_internos_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos_chamados_interno'
    AND auth.jwt() ->> 'email' = 'daniel.brotas@viasudeste.com'
  );
