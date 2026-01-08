-- Create storage bucket for meditation audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meditation-audio',
  'meditation-audio',
  true,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav']::text[]
) ON CONFLICT (id) DO NOTHING;

-- Allow public read access to meditation audio
CREATE POLICY "Meditation audio is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'meditation-audio');

-- Only admins can upload/manage meditation audio
CREATE POLICY "Admins can upload meditation audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'meditation-audio' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update meditation audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'meditation-audio' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete meditation audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'meditation-audio' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);