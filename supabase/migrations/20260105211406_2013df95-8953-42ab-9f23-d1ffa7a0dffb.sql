-- Extend nutrition_settings for comprehensive admin coaching configuration
-- This is the single source of truth for all AI prompts and advice

ALTER TABLE public.nutrition_settings
ADD COLUMN IF NOT EXISTS coaching_style text DEFAULT 'empathisch',
ADD COLUMN IF NOT EXISTS coaching_tone text DEFAULT 'vriendelijk',
ADD COLUMN IF NOT EXISTS target_protein_per_kg numeric(3,1) DEFAULT 1.6,
ADD COLUMN IF NOT EXISTS target_sleep_hours numeric(3,1) DEFAULT 8.0,
ADD COLUMN IF NOT EXISTS target_eating_window_hours integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS perimenopause_focus text[] DEFAULT ARRAY['hormoonbalans', 'energieniveau', 'slaapkwaliteit', 'stressmanagement']::text[],
ADD COLUMN IF NOT EXISTS supplement_recommendations text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS avoid_ingredients text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS prefer_ingredients text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS coaching_context text,
ADD COLUMN IF NOT EXISTS app_philosophy text DEFAULT 'Perimenopauze Plan helpt vrouwen 35+ om via voeding, beweging en leefstijl hun hormoonbalans te ondersteunen. Alle adviezen zijn specifiek afgestemd op de perimenopauze.';

COMMENT ON COLUMN public.nutrition_settings.coaching_style IS 'Stijl van coaching: empathisch, direct, motiverend, neutraal';
COMMENT ON COLUMN public.nutrition_settings.target_protein_per_kg IS 'Eiwit target per kg lichaamsgewicht';
COMMENT ON COLUMN public.nutrition_settings.perimenopause_focus IS 'Focus gebieden voor perimenopauze coaching';
COMMENT ON COLUMN public.nutrition_settings.app_philosophy IS 'Kernfilosofie die in alle AI prompts wordt meegenomen';