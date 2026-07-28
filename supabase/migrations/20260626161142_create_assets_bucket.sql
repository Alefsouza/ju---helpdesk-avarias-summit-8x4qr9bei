DO $DO$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('assets', 'assets', true) 
  ON CONFLICT (id) DO UPDATE SET public = true;
END $DO$;

DROP POLICY IF EXISTS "assets_select" ON storage.objects;
CREATE POLICY "assets_select" ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'assets');

DROP POLICY IF EXISTS "assets_insert" ON storage.objects;
CREATE POLICY "assets_insert" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'assets');

DROP POLICY IF EXISTS "assets_insert_bg" ON storage.objects;
CREATE POLICY "assets_insert_bg" ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'assets' AND name = 'background-bus-a97ed.png');

DROP POLICY IF EXISTS "assets_update" ON storage.objects;
CREATE POLICY "assets_update" ON storage.objects 
  FOR UPDATE TO authenticated 
  USING (bucket_id = 'assets');

DROP POLICY IF EXISTS "assets_delete" ON storage.objects;
CREATE POLICY "assets_delete" ON storage.objects 
  FOR DELETE TO authenticated 
  USING (bucket_id = 'assets');
