-- Fix day_score to use 0-10 scale instead of 40-80
DROP VIEW IF EXISTS public.v_daily_scores;

CREATE VIEW public.v_daily_scores AS
SELECT 
    d.id AS day_id,
    d.day_date,
    d.owner_id,
    count(m.id) AS meals_count,
    COALESCE(sum(m.kcal), 0::numeric) AS kcal_total,
    COALESCE(sum(m.protein_g), 0::numeric) AS protein_g,
    COALESCE(sum(m.carbs_g), 0::numeric) AS carbs_g,
    COALESCE(sum(m.fiber_g), 0::numeric) AS fiber_g,
    CASE
        WHEN count(m.id) = 0 THEN NULL::integer
        WHEN sum(m.protein_g) >= 50::numeric AND sum(m.fiber_g) >= 20::numeric THEN 8
        WHEN sum(m.protein_g) >= 40::numeric OR sum(m.fiber_g) >= 15::numeric THEN 6
        ELSE 4
    END AS day_score,
    array_remove(ARRAY[
        CASE
            WHEN COALESCE(sum(m.protein_g), 0::numeric) >= 50::numeric THEN 'Goed eiwit'::text
            ELSE NULL::text
        END,
        CASE
            WHEN COALESCE(sum(m.fiber_g), 0::numeric) >= 20::numeric THEN 'Goed vezels'::text
            ELSE NULL::text
        END], NULL::text) AS score_reasons
FROM diary_days d
LEFT JOIN meals m ON m.day_id = d.id AND m.owner_id = d.owner_id
WHERE d.owner_id = auth.uid()
GROUP BY d.id, d.day_date, d.owner_id;