-- FIX 1: Create views that hide owner_id for anonymous community content
-- Drop existing views if they exist
DROP VIEW IF EXISTS public.v_community_posts;
DROP VIEW IF EXISTS public.v_community_comments;

-- Create view for community posts that hides owner_id for anonymous posts
CREATE OR REPLACE VIEW public.v_community_posts AS
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

-- Create view for community comments that hides owner_id for anonymous comments
CREATE OR REPLACE VIEW public.v_community_comments AS
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

-- FIX 2: Fix community_likes - remove public visibility, only show to post owners and like owners
DROP POLICY IF EXISTS "Anyone can view likes" ON public.community_likes;
CREATE POLICY "Users can view their own likes" 
  ON public.community_likes 
  FOR SELECT 
  USING (auth.uid() = owner_id);

-- FIX 3: Fix nutrition_settings policies - restrict to owner only
DROP POLICY IF EXISTS "Anyone authenticated can view nutrition settings" ON public.nutrition_settings;
DROP POLICY IF EXISTS "Authenticated users can update nutrition settings" ON public.nutrition_settings;

CREATE POLICY "Users can view their own nutrition settings" 
  ON public.nutrition_settings 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own nutrition settings" 
  ON public.nutrition_settings 
  FOR UPDATE 
  USING (auth.uid() = id);

-- FIX 4: Fix exercises table - restrict management to admins only
DROP POLICY IF EXISTS "Authenticated users can manage exercises" ON public.exercises;

CREATE POLICY "Admins can manage exercises" 
  ON public.exercises 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- FIX 5: Fix meditations table - restrict management to admins only
DROP POLICY IF EXISTS "Authenticated users can manage meditations" ON public.meditations;

CREATE POLICY "Admins can manage meditations" 
  ON public.meditations 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- FIX 6: Add missing DELETE policies for GDPR compliance
-- cycle_preferences
CREATE POLICY "Users can delete their own cycle preferences" 
  ON public.cycle_preferences 
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- cycle_predictions
CREATE POLICY "Users can delete their own cycle predictions" 
  ON public.cycle_predictions 
  FOR DELETE 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own cycle predictions" 
  ON public.cycle_predictions 
  FOR UPDATE 
  USING (auth.uid() = owner_id);

-- ai_usage - allow delete for GDPR
CREATE POLICY "Users can delete their own ai usage" 
  ON public.ai_usage 
  FOR DELETE 
  USING (auth.uid() = owner_id);