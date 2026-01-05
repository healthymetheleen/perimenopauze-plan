-- Add profile fields for personalized advice
-- age_category is required (app is for women > 30)
-- height and weight are optional for calorie/protein targets

-- Add columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS age_category text CHECK (age_category IN ('30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60+')),
ADD COLUMN IF NOT EXISTS height_cm integer CHECK (height_cm IS NULL OR (height_cm >= 100 AND height_cm <= 250)),
ADD COLUMN IF NOT EXISTS weight_kg numeric(4,1) CHECK (weight_kg IS NULL OR (weight_kg >= 30 AND weight_kg <= 300)),
ADD COLUMN IF NOT EXISTS accepted_body_data boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS body_data_consent_at timestamptz;

-- Add consent for body data to user_consents
ALTER TABLE public.user_consents
ADD COLUMN IF NOT EXISTS accepted_body_data boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS body_data_consent_at timestamptz;

-- Remove photo storage columns from meals (photos are deleted immediately after analysis)
-- Keep only the AI analysis result in quality_flags
-- We won't drop photo_path/photo_expires_at if they exist, just ignore them

-- Drop the meal-photos bucket if it exists (we don't store photos anymore)
DELETE FROM storage.buckets WHERE id = 'meal-photos';

-- Remove old photo cleanup function as we don't need it anymore
DROP FUNCTION IF EXISTS public.cleanup_expired_meal_photos();