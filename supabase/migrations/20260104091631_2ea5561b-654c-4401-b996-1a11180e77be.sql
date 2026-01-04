-- Create community posts table
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'algemeen',
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create likes table (to track who liked what)
CREATE TABLE public.community_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, owner_id)
);

-- Enable RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

-- Posts policies: all authenticated users can view, only owner can modify
CREATE POLICY "Anyone can view posts" ON public.community_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create posts" ON public.community_posts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own posts" ON public.community_posts
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own posts" ON public.community_posts
  FOR DELETE USING (auth.uid() = owner_id);

-- Comments policies
CREATE POLICY "Anyone can view comments" ON public.community_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON public.community_comments
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own comments" ON public.community_comments
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own comments" ON public.community_comments
  FOR DELETE USING (auth.uid() = owner_id);

-- Likes policies
CREATE POLICY "Anyone can view likes" ON public.community_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can create likes" ON public.community_likes
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own likes" ON public.community_likes
  FOR DELETE USING (auth.uid() = owner_id);

-- Function to update likes count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Function to update comments count
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Add updated_at trigger
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_comments_updated_at
  BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();