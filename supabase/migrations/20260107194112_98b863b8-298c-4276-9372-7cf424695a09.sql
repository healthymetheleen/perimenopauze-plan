-- Add language column to community_posts
ALTER TABLE public.community_posts 
ADD COLUMN language TEXT NOT NULL DEFAULT 'nl' CHECK (language IN ('nl', 'en'));

-- Create index for faster filtering
CREATE INDEX idx_community_posts_language ON public.community_posts(language);

-- Update the view to include language
DROP VIEW IF EXISTS public.v_community_posts;
CREATE VIEW public.v_community_posts AS
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