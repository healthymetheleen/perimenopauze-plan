-- Create global nutrition settings table for admin configuration
-- This stores app-wide nutrition targets and diet rules that affect AI prompts, scores, and insights

CREATE TABLE public.nutrition_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Macronutrient targets
  target_kcal INTEGER DEFAULT 2000,
  target_protein_g INTEGER DEFAULT 70,
  target_carbs_g INTEGER DEFAULT 250,
  target_fat_g INTEGER DEFAULT 65,
  target_fiber_g INTEGER DEFAULT 30,
  
  -- Importance lists (stored as JSONB arrays)
  important_points JSONB DEFAULT '[]'::jsonb,      -- e.g. ["Voldoende eiwit", "Minimaal 30g vezels"]
  less_important_points JSONB DEFAULT '[]'::jsonb, -- e.g. ["Calorieën tellen niet strikt", "Koolhydraten niet beperken"]
  no_go_items JSONB DEFAULT '[]'::jsonb,           -- e.g. ["Ultra-bewerkt voedsel", "Frisdrank", "Chips"]
  
  -- Diet philosophy / vision (free text for AI context)
  diet_vision TEXT DEFAULT '',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default row - there should only be one row in this table
INSERT INTO public.nutrition_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001');

-- Enable RLS
ALTER TABLE public.nutrition_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the global settings
CREATE POLICY "Anyone authenticated can view nutrition settings"
ON public.nutrition_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can update - for now we allow any authenticated user to update
-- In production you would add an is_admin check
CREATE POLICY "Authenticated users can update nutrition settings"
ON public.nutrition_settings
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_nutrition_settings_updated_at
BEFORE UPDATE ON public.nutrition_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();