-- Fix v_community_posts view: hide owner_id when is_anonymous = true
DROP VIEW IF EXISTS public.v_community_posts;
CREATE VIEW public.v_community_posts AS
SELECT 
  id,
  CASE WHEN is_anonymous = true THEN NULL ELSE owner_id END AS owner_id,
  title,
  content,
  category,
  is_anonymous,
  likes_count,
  comments_count,
  created_at,
  updated_at
FROM public.community_posts;

-- Fix v_community_comments view: hide owner_id when is_anonymous = true
DROP VIEW IF EXISTS public.v_community_comments;
CREATE VIEW public.v_community_comments AS
SELECT 
  id,
  post_id,
  CASE WHEN is_anonymous = true THEN NULL ELSE owner_id END AS owner_id,
  content,
  is_anonymous,
  created_at,
  updated_at
FROM public.community_comments;

-- Grant select on views to authenticated users
GRANT SELECT ON public.v_community_posts TO authenticated;
GRANT SELECT ON public.v_community_comments TO authenticated;