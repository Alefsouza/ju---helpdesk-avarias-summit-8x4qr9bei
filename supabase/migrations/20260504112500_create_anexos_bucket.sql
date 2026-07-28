DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('anexos', 'anexos', true) 
  ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "anexos_select" ON storage.objects;
CREATE POLICY "anexos_select" ON storage.objects 
  FOR SELECT TO authenticated 
  USING (bucket_id = 'anexos');

DROP POLICY IF EXISTS "anexos_insert" ON storage.objects;
CREATE POLICY "anexos_insert" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'anexos');
