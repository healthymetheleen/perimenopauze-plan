-- Create recipe favorites table
CREATE TABLE public.recipe_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, recipe_id)
);

-- Enable RLS
ALTER TABLE public.recipe_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.recipe_favorites
FOR SELECT
USING (auth.uid() = owner_id);

-- Users can add their own favorites
CREATE POLICY "Users can add their own favorites"
ON public.recipe_favorites
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Users can remove their own favorites
CREATE POLICY "Users can delete their own favorites"
ON public.recipe_favorites
FOR DELETE
USING (auth.uid() = owner_id);

-- Add index for faster lookups
CREATE INDEX idx_recipe_favorites_owner ON public.recipe_favorites(owner_id);
CREATE INDEX idx_recipe_favorites_recipe ON public.recipe_favorites(recipe_id);