-- Drop and recreate the v_daily_scores view with kcal_total and carbs_g
DROP VIEW IF EXISTS public.v_daily_scores;

CREATE VIEW public.v_daily_scores AS
SELECT 
    d.id AS day_id,
    d.owner_id,
    d.day_date,
    COALESCE(GREATEST(0, 10 -
        CASE WHEN COALESCE(sum(m.protein_g), 0::numeric) < 70::numeric THEN 2 ELSE 0 END -
        CASE WHEN COALESCE(sum(m.fiber_g), 0::numeric) < 25::numeric THEN 1 ELSE 0 END -
        CASE WHEN count(m.id) >= 7 THEN 2 ELSE 0 END -
        CASE WHEN max(m.time_local) >= '21:00:00'::time without time zone THEN 1 ELSE 0 END
    ), 0) AS day_score,
    array_remove(ARRAY[
        CASE WHEN COALESCE(sum(m.protein_g), 0::numeric) < 70::numeric THEN 'low_protein'::text ELSE NULL::text END,
        CASE WHEN COALESCE(sum(m.fiber_g), 0::numeric) < 25::numeric THEN 'low_fiber'::text ELSE NULL::text END,
        CASE WHEN count(m.id) >= 7 THEN 'many_eating_moments'::text ELSE NULL::text END,
        CASE WHEN max(m.time_local) >= '21:00:00'::time without time zone THEN 'late_eating'::text ELSE NULL::text END
    ], NULL::text) AS score_reasons,
    count(m.id)::integer AS meals_count,
    COALESCE(sum(m.kcal), 0::numeric) AS kcal_total,
    COALESCE(sum(m.protein_g), 0::numeric) AS protein_g,
    COALESCE(sum(m.carbs_g), 0::numeric) AS carbs_g,
    COALESCE(sum(m.fiber_g), 0::numeric) AS fiber_g
FROM diary_days d
LEFT JOIN meals m ON m.day_id = d.id
GROUP BY d.id, d.owner_id, d.day_date;