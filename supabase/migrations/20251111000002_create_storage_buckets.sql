-- Migration: Create storage buckets for user uploads
-- Responsabilidade: Bucket para avatares e arquivos do usuário

-- Criar bucket 'user-uploads' (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-uploads',
  'user-uploads',
  true, -- público para avatares
  2097152, -- 2MB em bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies para user-uploads
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-uploads' AND
    (storage.foldername(name))[1] = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Anyone can view uploaded files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'user-uploads');

CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-uploads' AND
    (storage.foldername(name))[1] = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-uploads' AND
    (storage.foldername(name))[1] = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Comentários
COMMENT ON COLUMN storage.buckets.file_size_limit IS 'Limite de 2MB para uploads de avatar';
