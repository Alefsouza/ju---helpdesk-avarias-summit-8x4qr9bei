INSERT INTO storage.buckets (id, name, public) 
VALUES ('chamados', 'chamados', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chamados_select" ON storage.objects;
CREATE POLICY "chamados_select" ON storage.objects 
  FOR SELECT TO authenticated 
  USING (bucket_id = 'chamados');

DROP POLICY IF EXISTS "chamados_insert" ON storage.objects;
CREATE POLICY "chamados_insert" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'chamados');
