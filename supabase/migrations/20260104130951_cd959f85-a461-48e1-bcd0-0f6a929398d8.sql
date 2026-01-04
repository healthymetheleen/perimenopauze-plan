-- Fix views to use SECURITY INVOKER (not SECURITY DEFINER)
DROP VIEW IF EXISTS public.v_community_posts;
DROP VIEW IF EXISTS public.v_community_comments;

CREATE VIEW public.v_community_posts 
WITH (security_invoker = true) AS
SELECT 
  id, 
  title, 
  content, 
  category, 
  is_anonymous,
  CASE WHEN is_anonymous THEN NULL ELSE owner_id END as owner_id,
  likes_count, 
  comments_count, 
  created_at, 
  updated_at
FROM public.community_posts;

CREATE VIEW public.v_community_comments 
WITH (security_invoker = true) AS
SELECT 
  id,
  post_id,
  content,
  is_anonymous,
  CASE WHEN is_anonymous THEN NULL ELSE owner_id END as owner_id,
  created_at,
  updated_at
FROM public.community_comments;

-- Grant access to views
GRANT SELECT ON public.v_community_posts TO authenticated, anon;
GRANT SELECT ON public.v_community_comments TO authenticated, anon;