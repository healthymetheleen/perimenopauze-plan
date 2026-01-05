-- Fix the SECURITY DEFINER views by recreating them with SECURITY INVOKER
DROP VIEW IF EXISTS public.v_community_posts;
DROP VIEW IF EXISTS public.v_community_comments;

-- Create view for community posts with SECURITY INVOKER
CREATE VIEW public.v_community_posts 
WITH (security_invoker = on) AS
SELECT 
  id,
  title,
  content,
  category,
  is_anonymous,
  likes_count,
  comments_count,
  created_at,
  updated_at,
  CASE 
    WHEN is_anonymous = true THEN NULL 
    ELSE owner_id 
  END AS owner_id
FROM public.community_posts;

-- Create view for community comments with SECURITY INVOKER
CREATE VIEW public.v_community_comments 
WITH (security_invoker = on) AS
SELECT 
  id,
  post_id,
  content,
  is_anonymous,
  created_at,
  updated_at,
  CASE 
    WHEN is_anonymous = true THEN NULL 
    ELSE owner_id 
  END AS owner_id
FROM public.community_comments;