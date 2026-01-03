-- Create recipes table for admin-managed recipes
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 2,
  image_url TEXT,
  
  -- Categorization
  meal_type TEXT NOT NULL, -- ontbijt, lunch, diner, snack, tussendoortje
  seasons TEXT[] NOT NULL DEFAULT '{}', -- winter, lente, zomer, herfst
  diet_tags TEXT[] NOT NULL DEFAULT '{}', -- vegetarisch, veganistisch, glutenvrij, zuivelvrij, etc.
  
  -- Ingredients as JSONB array for flexibility
  ingredients JSONB NOT NULL DEFAULT '[]',
  
  -- Nutrition info (optional)
  kcal INTEGER,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  fiber_g NUMERIC,
  
  -- Metadata
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Everyone can read published recipes
CREATE POLICY "Anyone can view published recipes" 
ON public.recipes 
FOR SELECT 
USING (is_published = true);

-- Only admin (owner) can manage recipes
CREATE POLICY "Owners can insert own recipes" 
ON public.recipes 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own recipes" 
ON public.recipes 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own recipes" 
ON public.recipes 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Owners can also view their own unpublished recipes
CREATE POLICY "Owners can view own recipes" 
ON public.recipes 
FOR SELECT 
USING (auth.uid() = owner_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_recipes_updated_at
BEFORE UPDATE ON public.recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for common queries
CREATE INDEX idx_recipes_meal_type ON public.recipes(meal_type);
CREATE INDEX idx_recipes_seasons ON public.recipes USING GIN(seasons);
CREATE INDEX idx_recipes_diet_tags ON public.recipes USING GIN(diet_tags);
CREATE INDEX idx_recipes_published ON public.recipes(is_published) WHERE is_published = true;