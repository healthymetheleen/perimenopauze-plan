-- Add cycle_phases column to recipes table (separate from weather seasons)
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS cycle_phases text[] DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN public.recipes.seasons IS 'Weather/calendar seasons: lente, zomer, herfst, winter';
COMMENT ON COLUMN public.recipes.cycle_phases IS 'Menstrual cycle phases: menstruatie, folliculair, ovulatie, luteaal';