-- =====================================================
-- FIX SECURITY DEFINER VIEWS
-- Change views to use invoker security (respects RLS of calling user)
-- =====================================================

-- Drop and recreate v_community_posts as SECURITY INVOKER
DROP VIEW IF EXISTS public.v_community_posts;
CREATE VIEW public.v_community_posts 
WITH (security_invoker = on)
AS SELECT 
  id,
  title,
  content,
  category,
  is_anonymous,
  -- Hide owner_id for anonymous posts
  CASE WHEN is_anonymous THEN NULL ELSE owner_id END as owner_id,
  likes_count,
  comments_count,
  created_at,
  updated_at
FROM public.community_posts;

-- Drop and recreate v_community_comments as SECURITY INVOKER
DROP VIEW IF EXISTS public.v_community_comments;
CREATE VIEW public.v_community_comments
WITH (security_invoker = on)
AS SELECT
  id,
  post_id,
  content,
  is_anonymous,
  -- Hide owner_id for anonymous comments
  CASE WHEN is_anonymous THEN NULL ELSE owner_id END as owner_id,
  created_at,
  updated_at
FROM public.community_comments;

-- Drop and recreate v_daily_scores as SECURITY INVOKER
DROP VIEW IF EXISTS public.v_daily_scores;
CREATE VIEW public.v_daily_scores
WITH (security_invoker = on)
AS SELECT
  d.id as day_id,
  d.day_date,
  d.owner_id,
  COUNT(m.id) as meals_count,
  COALESCE(SUM(m.kcal), 0) as kcal_total,
  COALESCE(SUM(m.protein_g), 0) as protein_g,
  COALESCE(SUM(m.carbs_g), 0) as carbs_g,
  COALESCE(SUM(m.fiber_g), 0) as fiber_g,
  -- Calculate day score based on quality flags
  CASE 
    WHEN COUNT(m.id) = 0 THEN NULL
    WHEN SUM(m.protein_g) >= 50 AND SUM(m.fiber_g) >= 20 THEN 80
    WHEN SUM(m.protein_g) >= 40 OR SUM(m.fiber_g) >= 15 THEN 60
    ELSE 40
  END as day_score,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN COALESCE(SUM(m.protein_g), 0) >= 50 THEN 'Goed eiwit' END,
    CASE WHEN COALESCE(SUM(m.fiber_g), 0) >= 20 THEN 'Goed vezels' END
  ], NULL) as score_reasons
FROM public.diary_days d
LEFT JOIN public.meals m ON m.day_id = d.id AND m.owner_id = d.owner_id
WHERE d.owner_id = auth.uid()  -- RLS at view level
GROUP BY d.id, d.day_date, d.owner_id;

-- Drop and recreate v_symptom_catalog as SECURITY INVOKER
DROP VIEW IF EXISTS public.v_symptom_catalog;
CREATE VIEW public.v_symptom_catalog
WITH (security_invoker = on)
AS SELECT
  code,
  label_nl,
  description_nl,
  domain
FROM public.symptom_catalog
WHERE is_active = true;

-- Grant select on views to authenticated
GRANT SELECT ON public.v_community_posts TO authenticated;
GRANT SELECT ON public.v_community_comments TO authenticated;
GRANT SELECT ON public.v_daily_scores TO authenticated;
GRANT SELECT ON public.v_symptom_catalog TO authenticated;
GRANT SELECT ON public.v_symptom_catalog TO anon;


-- =====================================================
-- STORAGE HARDENING - Make content-images bucket private
-- =====================================================

-- Update bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'content-images';

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Anyone can view content images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload content images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "content_images_public_select" ON storage.objects;

-- Create strict storage policies for content-images
-- Only admins can upload/manage content images
CREATE POLICY "content_images_admin_all" ON storage.objects
FOR ALL USING (
  bucket_id = 'content-images' 
  AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'content-images' 
  AND has_role(auth.uid(), 'admin')
);

-- Authenticated users can view content images (for app content)
CREATE POLICY "content_images_auth_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'content-images' 
  AND auth.uid() IS NOT NULL
);


-- =====================================================
-- CREATE USER-UPLOADS BUCKET (for user-specific files)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-uploads', 
  'user-uploads', 
  false, 
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
) ON CONFLICT (id) DO NOTHING;

-- User uploads: users can only access their own folder
CREATE POLICY "user_uploads_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "user_uploads_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "user_uploads_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "user_uploads_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);