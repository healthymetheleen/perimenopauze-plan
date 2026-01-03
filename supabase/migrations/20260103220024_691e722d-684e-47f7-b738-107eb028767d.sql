-- Fix RLS on symptom_catalog
ALTER TABLE public.symptom_catalog ENABLE ROW LEVEL SECURITY;

-- Fix security definer views by recreating with security_invoker
DROP VIEW IF EXISTS public.v_symptom_catalog;
CREATE VIEW public.v_symptom_catalog 
WITH (security_invoker = true) AS
SELECT code, domain, label_nl, description_nl
FROM public.symptom_catalog
WHERE is_active = true;

DROP VIEW IF EXISTS public.v_daily_scores;
CREATE VIEW public.v_daily_scores 
WITH (security_invoker = true) AS
SELECT 
  d.id as day_id,
  d.owner_id,
  d.day_date,
  COALESCE(
    GREATEST(0, 10 
      - CASE WHEN COALESCE(SUM(m.protein_g), 0) < 70 THEN 2 ELSE 0 END
      - CASE WHEN COALESCE(SUM(m.fiber_g), 0) < 25 THEN 1 ELSE 0 END
      - CASE WHEN COUNT(m.id) >= 7 THEN 2 ELSE 0 END
      - CASE WHEN MAX(m.time_local) >= '21:00' THEN 1 ELSE 0 END
    ), 0
  ) as day_score,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN COALESCE(SUM(m.protein_g), 0) < 70 THEN 'low_protein' END,
    CASE WHEN COALESCE(SUM(m.fiber_g), 0) < 25 THEN 'low_fiber' END,
    CASE WHEN COUNT(m.id) >= 7 THEN 'many_eating_moments' END,
    CASE WHEN MAX(m.time_local) >= '21:00' THEN 'late_eating' END
  ], NULL) as score_reasons,
  COUNT(m.id)::int as meals_count,
  COALESCE(SUM(m.protein_g), 0) as protein_g,
  COALESCE(SUM(m.fiber_g), 0) as fiber_g
FROM public.diary_days d
LEFT JOIN public.meals m ON m.day_id = d.id
GROUP BY d.id, d.owner_id, d.day_date;

-- Fix function search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;