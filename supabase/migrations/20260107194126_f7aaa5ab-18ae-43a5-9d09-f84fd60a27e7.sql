-- Recreate view with SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.v_community_posts;
CREATE VIEW public.v_community_posts 
WITH (security_invoker = true) AS
SELECT 
  id,
  CASE WHEN is_anonymous THEN NULL ELSE owner_id END as owner_id,
  title,
  content,
  category,
  language,
  is_anonymous,
  likes_count,
  comments_count,
  created_at,
  updated_at
FROM public.community_posts;