-- Create coaching_preferences table for AI focus areas
CREATE TABLE public.coaching_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  
  -- Focus areas (which topics should AI prioritize in analysis)
  focus_nutrition BOOLEAN DEFAULT true,
  focus_sleep BOOLEAN DEFAULT true,
  focus_cycle BOOLEAN DEFAULT true,
  focus_movement BOOLEAN DEFAULT false,
  focus_stress BOOLEAN DEFAULT false,
  focus_symptoms TEXT[] DEFAULT '{}',
  
  -- Custom notes for AI context
  personal_context TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT coaching_preferences_owner_id_key UNIQUE (owner_id)
);

-- Enable RLS
ALTER TABLE public.coaching_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own coaching preferences"
ON public.coaching_preferences
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own coaching preferences"
ON public.coaching_preferences
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own coaching preferences"
ON public.coaching_preferences
FOR UPDATE
USING (auth.uid() = owner_id);

-- Trigger for updated_at
CREATE TRIGGER update_coaching_preferences_updated_at
BEFORE UPDATE ON public.coaching_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();