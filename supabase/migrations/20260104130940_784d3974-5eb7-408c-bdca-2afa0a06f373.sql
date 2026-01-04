-- Fix 1: Create secure views for community data that mask owner_id for anonymous posts
CREATE OR REPLACE VIEW public.v_community_posts AS
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

CREATE OR REPLACE VIEW public.v_community_comments AS
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

-- Fix 4: Update delete_user_data function to handle community data
CREATE OR REPLACE FUNCTION public.delete_user_data(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to delete their own data
  IF auth.uid() IS NULL OR auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Unauthorized: can only delete own data';
  END IF;
  
  -- Anonymize community content instead of deleting (preserves community value)
  UPDATE public.community_posts 
  SET is_anonymous = true
  WHERE owner_id = user_uuid;
  
  UPDATE public.community_comments 
  SET is_anonymous = true
  WHERE owner_id = user_uuid;
  
  -- Delete likes (no content value to preserve)
  DELETE FROM public.community_likes WHERE owner_id = user_uuid;
  
  -- Delete in order respecting foreign keys
  DELETE FROM public.meals WHERE owner_id = user_uuid;
  DELETE FROM public.symptoms WHERE owner_id = user_uuid;
  DELETE FROM public.daily_context WHERE owner_id = user_uuid;
  DELETE FROM public.diary_days WHERE owner_id = user_uuid;
  DELETE FROM public.sleep_sessions WHERE owner_id = user_uuid;
  DELETE FROM public.cycle_symptom_logs WHERE owner_id = user_uuid;
  DELETE FROM public.bleeding_logs WHERE owner_id = user_uuid;
  DELETE FROM public.fertility_signals WHERE owner_id = user_uuid;
  DELETE FROM public.cycle_predictions WHERE owner_id = user_uuid;
  DELETE FROM public.cycles WHERE owner_id = user_uuid;
  DELETE FROM public.cycle_preferences WHERE owner_id = user_uuid;
  DELETE FROM public.ai_usage WHERE owner_id = user_uuid;
  DELETE FROM public.entitlements WHERE owner_id = user_uuid;
  DELETE FROM public.subscriptions WHERE owner_id = user_uuid;
  DELETE FROM public.user_consents WHERE owner_id = user_uuid;
  DELETE FROM public.recipes WHERE owner_id = user_uuid;
  DELETE FROM public.profiles WHERE id = user_uuid;
  
  RETURN TRUE;
END;
$$;