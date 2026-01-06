-- Add thumbnail_url column to recipes table
ALTER TABLE public.recipes 
ADD COLUMN thumbnail_url text;