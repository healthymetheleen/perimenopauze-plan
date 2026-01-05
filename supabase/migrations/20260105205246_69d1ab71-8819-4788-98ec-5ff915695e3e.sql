-- Create private storage bucket for meal photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meal-photos', 
  'meal-photos', 
  false,  -- Private bucket, no public URLs
  5242880,  -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS policies for meal-photos bucket
-- Users can only access their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'meal-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'meal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'meal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add photo_path column to meals table for storing the reference
ALTER TABLE public.meals
ADD COLUMN photo_path TEXT,
ADD COLUMN photo_expires_at TIMESTAMP WITH TIME ZONE;

-- Add separate consent columns for photo analysis
ALTER TABLE public.user_consents
ADD COLUMN IF NOT EXISTS accepted_photo_analysis BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS photo_analysis_consent_at TIMESTAMP WITH TIME ZONE;

-- Create function to cleanup expired meal photos (run daily via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_meal_photos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_photo RECORD;
BEGIN
  -- Find expired photos (30 days after creation)
  FOR expired_photo IN
    SELECT id, owner_id, photo_path
    FROM meals
    WHERE photo_path IS NOT NULL
    AND (photo_expires_at IS NULL OR photo_expires_at < NOW())
    AND created_at < NOW() - INTERVAL '30 days'
  LOOP
    -- Delete from storage (will fail silently if already deleted)
    BEGIN
      DELETE FROM storage.objects
      WHERE bucket_id = 'meal-photos'
      AND name = expired_photo.photo_path;
    EXCEPTION WHEN OTHERS THEN
      -- Log but continue
      RAISE NOTICE 'Could not delete photo: %', expired_photo.photo_path;
    END;
    
    -- Clear the photo_path in meals table
    UPDATE meals
    SET photo_path = NULL, photo_expires_at = NULL
    WHERE id = expired_photo.id;
  END LOOP;
END;
$$;