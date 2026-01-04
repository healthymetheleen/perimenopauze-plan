-- Create meditations table for managing meditation content
CREATE TABLE public.meditations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sleep', 'stress', 'energy', 'cycle')),
  image_url TEXT,
  audio_url TEXT,
  cycle_season TEXT CHECK (cycle_season IN ('winter', 'lente', 'zomer', 'herfst')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercises table for managing yoga/movement exercises
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_dutch TEXT NOT NULL,
  description TEXT,
  duration TEXT NOT NULL,
  benefits TEXT[] DEFAULT '{}',
  image_url TEXT,
  video_url TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  cycle_phase TEXT NOT NULL CHECK (cycle_phase IN ('menstrual', 'follicular', 'ovulatory', 'luteal')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.meditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (everyone can see published content)
CREATE POLICY "Anyone can view active meditations" 
ON public.meditations 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Anyone can view active exercises" 
ON public.exercises 
FOR SELECT 
USING (is_active = true);

-- Create policies for admin write access (only specific users can manage)
-- For now, we'll use a simple check if user is authenticated
-- In production, you'd want a proper admin role
CREATE POLICY "Authenticated users can manage meditations" 
ON public.meditations 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage exercises" 
ON public.exercises 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create storage bucket for content images
INSERT INTO storage.buckets (id, name, public) VALUES ('content-images', 'content-images', true);

-- Storage policies for content images
CREATE POLICY "Content images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'content-images');

CREATE POLICY "Authenticated users can upload content images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'content-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update content images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'content-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete content images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'content-images' AND auth.uid() IS NOT NULL);

-- Add triggers for updated_at
CREATE TRIGGER update_meditations_updated_at
  BEFORE UPDATE ON public.meditations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();