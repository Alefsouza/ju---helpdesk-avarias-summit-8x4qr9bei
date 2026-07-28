-- Parte 1: Configurar bucket como público (cria se não existir, atualiza se existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Parte 2: Configurar RLS do bucket
DROP POLICY IF EXISTS "Permitir leitura pública" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública para documentos" ON storage.objects;

-- Criar política para SELECT permitindo acesso público aos arquivos deste bucket
CREATE POLICY "Permitir leitura pública para documentos" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'documentos');
