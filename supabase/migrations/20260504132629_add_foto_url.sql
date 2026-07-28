DO $$
BEGIN
  ALTER TABLE public.perfil_usuario ADD COLUMN IF NOT EXISTS foto_url TEXT;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('perfil_fotos', 'perfil_fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Fotos de perfil sao publicas" ON storage.objects;
CREATE POLICY "Fotos de perfil sao publicas" ON storage.objects
  FOR SELECT USING (bucket_id = 'perfil_fotos');

DROP POLICY IF EXISTS "Usuarios podem inserir suas fotos" ON storage.objects;
CREATE POLICY "Usuarios podem inserir suas fotos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'perfil_fotos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Usuarios podem atualizar suas fotos" ON storage.objects;
CREATE POLICY "Usuarios podem atualizar suas fotos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'perfil_fotos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Usuarios podem deletar suas fotos" ON storage.objects;
CREATE POLICY "Usuarios podem deletar suas fotos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'perfil_fotos' AND auth.uid()::text = (storage.foldername(name))[1]);
