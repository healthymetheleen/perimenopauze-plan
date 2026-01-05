-- Fix SECURITY DEFINER views by recreating them with SECURITY INVOKER
-- This ensures views run with the permissions of the querying user, not the view creator

-- Drop public.v_daily_scores first (has dependency on public tables)
DROP VIEW IF EXISTS public.v_daily_scores;

-- Recreate public.v_daily_scores with SECURITY INVOKER
CREATE OR REPLACE VIEW public.v_daily_scores
WITH (security_invoker = on)
AS
SELECT d.id AS day_id,
    d.day_date,
    d.owner_id,
    count(m.id) AS meals_count,
    COALESCE(sum(m.kcal), (0)::numeric) AS kcal_total,
    COALESCE(sum(m.protein_g), (0)::numeric) AS protein_g,
    COALESCE(sum(m.carbs_g), (0)::numeric) AS carbs_g,
    COALESCE(sum(m.fiber_g), (0)::numeric) AS fiber_g,
    CASE
        WHEN (count(m.id) = 0) THEN NULL::integer
        WHEN ((sum(m.protein_g) >= (50)::numeric) AND (sum(m.fiber_g) >= (20)::numeric)) THEN 8
        WHEN ((sum(m.protein_g) >= (40)::numeric) OR (sum(m.fiber_g) >= (15)::numeric)) THEN 6
        ELSE 4
    END AS day_score,
    array_remove(ARRAY[
        CASE WHEN (COALESCE(sum(m.protein_g), (0)::numeric) >= (50)::numeric) THEN 'Goed eiwit'::text ELSE NULL::text END,
        CASE WHEN (COALESCE(sum(m.fiber_g), (0)::numeric) >= (20)::numeric) THEN 'Goed vezels'::text ELSE NULL::text END
    ], NULL::text) AS score_reasons
FROM (public.diary_days d
    LEFT JOIN public.meals m ON (((m.day_id = d.id) AND (m.owner_id = d.owner_id))))
WHERE (d.owner_id = auth.uid())
GROUP BY d.id, d.day_date, d.owner_id;

-- Grant access to public.v_daily_scores
GRANT SELECT ON public.v_daily_scores TO authenticated;

-- Now fix app schema views in correct order (respecting dependencies)
-- 1. First drop dependent views
DROP VIEW IF EXISTS app.v_trends_7d;
DROP VIEW IF EXISTS app.v_daily_scores;
DROP VIEW IF EXISTS app.v_symptom_patterns_14d;
DROP VIEW IF EXISTS app.v_user_subscription;
DROP VIEW IF EXISTS app.v_daily_summary;

-- 2. Recreate app.v_daily_summary with SECURITY INVOKER
CREATE OR REPLACE VIEW app.v_daily_summary
WITH (security_invoker = on)
AS
SELECT dd.id AS day_id,
    dd.owner_id,
    dd.day_date,
    dd.timezone,
    dd.data_quality,
    COALESCE(m.meals_count, 0) AS meals_count,
    COALESCE(m.kcal_total, (0)::numeric) AS kcal_total,
    COALESCE(m.protein_g, (0)::numeric) AS protein_g,
    COALESCE(m.fiber_g, (0)::numeric) AS fiber_g,
    COALESCE(m.carbs_g, (0)::numeric) AS carbs_g,
    COALESCE(m.fat_g, (0)::numeric) AS fat_g,
    m.first_meal_time,
    m.last_meal_time,
    m.eating_window_h,
    m.avg_ultra_processed,
    CASE WHEN (m.last_meal_time > '21:00:00'::time without time zone) THEN true ELSE false END AS late_eating_flag,
    CASE WHEN (COALESCE(m.meals_count, 0) > 5) THEN true ELSE false END AS many_eating_moments_flag,
    dc.sleep_duration_h,
    dc.sleep_quality_0_10,
    dc.stress_0_10,
    dc.steps,
    dc.cycle_day,
    dc.cycle_phase,
    COALESCE(s.symptoms_array, '[]'::jsonb) AS symptoms,
    dd.created_at,
    dd.updated_at
FROM (((app.diary_days dd
    LEFT JOIN ( 
        SELECT meals.day_id,
            (count(*))::integer AS meals_count,
            sum(meals.kcal) AS kcal_total,
            sum(meals.protein_g) AS protein_g,
            sum(meals.fiber_g) AS fiber_g,
            sum(meals.carbs_g) AS carbs_g,
            sum(meals.fat_g) AS fat_g,
            min(meals.time_local) AS first_meal_time,
            max(meals.time_local) AS last_meal_time,
            (EXTRACT(epoch FROM (max(meals.time_local) - min(meals.time_local))) / (3600)::numeric) AS eating_window_h,
            avg(meals.ultra_processed_level) AS avg_ultra_processed
        FROM app.meals
        GROUP BY meals.day_id
    ) m ON ((dd.id = m.day_id)))
    LEFT JOIN app.daily_context dc ON (((dd.id = dc.day_id) AND (dd.owner_id = dc.owner_id))))
    LEFT JOIN ( 
        SELECT symptoms.day_id,
            jsonb_agg(jsonb_build_object('code', symptoms.symptom_code, 'severity', symptoms.severity_0_10)) AS symptoms_array
        FROM app.symptoms
        GROUP BY symptoms.day_id
    ) s ON ((dd.id = s.day_id)))
WHERE (dd.owner_id = auth.uid());

-- Grant access
GRANT SELECT ON app.v_daily_summary TO authenticated;

-- 3. Recreate app.v_daily_scores with SECURITY INVOKER
CREATE OR REPLACE VIEW app.v_daily_scores
WITH (security_invoker = on)
AS
SELECT day_id,
    owner_id,
    day_date,
    (GREATEST((0)::numeric, (((((((((10)::numeric -
        CASE WHEN (protein_g < (50)::numeric) THEN 1.5 ELSE (0)::numeric END) - 
        (CASE WHEN (fiber_g < (20)::numeric) THEN 1 ELSE 0 END)::numeric) - 
        (CASE WHEN many_eating_moments_flag THEN 1 ELSE 0 END)::numeric) - 
        (CASE WHEN late_eating_flag THEN 1 ELSE 0 END)::numeric) - 
        (CASE WHEN ((kcal_total > (0)::numeric) AND (kcal_total < (1200)::numeric)) THEN 2 ELSE 0 END)::numeric) -
        CASE WHEN (kcal_total > (2500)::numeric) THEN 0.5 ELSE (0)::numeric END) - 
        (CASE WHEN ((sleep_quality_0_10 IS NOT NULL) AND (sleep_quality_0_10 < 5)) THEN 1 ELSE 0 END)::numeric) - 
        (CASE WHEN ((stress_0_10 IS NOT NULL) AND (stress_0_10 > 7)) THEN 1 ELSE 0 END)::numeric)))::numeric(3,1) AS day_score,
    array_remove(ARRAY[
        CASE WHEN (protein_g < (50)::numeric) THEN 'low_protein'::text ELSE NULL::text END,
        CASE WHEN (fiber_g < (20)::numeric) THEN 'low_fiber'::text ELSE NULL::text END,
        CASE WHEN many_eating_moments_flag THEN 'many_eating_moments'::text ELSE NULL::text END,
        CASE WHEN late_eating_flag THEN 'late_eating'::text ELSE NULL::text END,
        CASE WHEN ((kcal_total > (0)::numeric) AND (kcal_total < (1200)::numeric)) THEN 'very_low_kcal'::text ELSE NULL::text END,
        CASE WHEN (kcal_total > (2500)::numeric) THEN 'very_high_kcal'::text ELSE NULL::text END,
        CASE WHEN ((sleep_quality_0_10 IS NOT NULL) AND (sleep_quality_0_10 < 5)) THEN 'sleep_low'::text ELSE NULL::text END,
        CASE WHEN ((stress_0_10 IS NOT NULL) AND (stress_0_10 > 7)) THEN 'stress_high'::text ELSE NULL::text END
    ], NULL::text) AS score_reasons,
    meals_count,
    kcal_total,
    protein_g,
    fiber_g,
    eating_window_h,
    first_meal_time,
    last_meal_time,
    sleep_duration_h,
    sleep_quality_0_10,
    stress_0_10,
    steps,
    cycle_phase,
    symptoms
FROM app.v_daily_summary ds;

-- Grant access
GRANT SELECT ON app.v_daily_scores TO authenticated;

-- 4. Recreate app.v_trends_7d with SECURITY INVOKER
CREATE OR REPLACE VIEW app.v_trends_7d
WITH (security_invoker = on)
AS
SELECT day_date,
    day_score,
    protein_g,
    fiber_g,
    meals_count,
    sleep_quality_0_10,
    stress_0_10,
    cycle_phase
FROM app.v_daily_scores ds
WHERE (day_date >= (CURRENT_DATE - '7 days'::interval))
ORDER BY day_date DESC;

-- Grant access
GRANT SELECT ON app.v_trends_7d TO authenticated;

-- 5. Recreate app.v_symptom_patterns_14d with SECURITY INVOKER
CREATE OR REPLACE VIEW app.v_symptom_patterns_14d
WITH (security_invoker = on)
AS
WITH symptom_days AS (
    SELECT sy.symptom_code,
        sy.severity_0_10,
        ds.protein_g,
        ds.fiber_g,
        ds.late_eating_flag,
        ds.many_eating_moments_flag
    FROM ((app.symptoms sy
        JOIN app.diary_days dd ON (((sy.day_id = dd.id) AND (sy.owner_id = dd.owner_id))))
        JOIN app.v_daily_summary ds ON ((dd.id = ds.day_id)))
    WHERE ((dd.owner_id = auth.uid()) AND (dd.day_date >= (CURRENT_DATE - '14 days'::interval)))
), high_severity AS (
    SELECT symptom_days.symptom_code,
        avg(symptom_days.protein_g) AS avg_protein,
        avg(symptom_days.fiber_g) AS avg_fiber,
        avg(CASE WHEN symptom_days.late_eating_flag THEN 1 ELSE 0 END) AS late_eating_rate,
        avg(CASE WHEN symptom_days.many_eating_moments_flag THEN 1 ELSE 0 END) AS many_eating_rate,
        count(*) AS count_high
    FROM symptom_days
    WHERE (symptom_days.severity_0_10 >= 6)
    GROUP BY symptom_days.symptom_code
), low_severity AS (
    SELECT symptom_days.symptom_code,
        avg(symptom_days.protein_g) AS avg_protein,
        avg(symptom_days.fiber_g) AS avg_fiber,
        avg(CASE WHEN symptom_days.late_eating_flag THEN 1 ELSE 0 END) AS late_eating_rate,
        avg(CASE WHEN symptom_days.many_eating_moments_flag THEN 1 ELSE 0 END) AS many_eating_rate,
        count(*) AS count_low
    FROM symptom_days
    WHERE (symptom_days.severity_0_10 < 6)
    GROUP BY symptom_days.symptom_code
)
SELECT sc.code AS symptom_code,
    sc.label_nl,
    sc.domain,
    COALESCE(h.count_high, (0)::bigint) AS days_high_severity,
    COALESCE(l.count_low, (0)::bigint) AS days_low_severity,
    round(COALESCE(h.avg_protein, (0)::numeric), 1) AS protein_g_high,
    round(COALESCE(l.avg_protein, (0)::numeric), 1) AS protein_g_low,
    round(COALESCE(h.avg_fiber, (0)::numeric), 1) AS fiber_g_high,
    round(COALESCE(l.avg_fiber, (0)::numeric), 1) AS fiber_g_low,
    round((COALESCE(h.late_eating_rate, (0)::numeric) * (100)::numeric), 0) AS late_eating_pct_high,
    round((COALESCE(l.late_eating_rate, (0)::numeric) * (100)::numeric), 0) AS late_eating_pct_low
FROM ((app.symptom_catalog sc
    LEFT JOIN high_severity h ON ((sc.code = h.symptom_code)))
    LEFT JOIN low_severity l ON ((sc.code = l.symptom_code)))
WHERE ((h.count_high > 0) OR (l.count_low > 0));

-- Grant access
GRANT SELECT ON app.v_symptom_patterns_14d TO authenticated;

-- 6. Recreate app.v_user_subscription with SECURITY INVOKER
CREATE OR REPLACE VIEW app.v_user_subscription
WITH (security_invoker = on)
AS
SELECT s.owner_id,
    s.plan,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end,
    e.can_use_digest,
    e.can_use_trends,
    e.can_use_patterns,
    e.max_days_history
FROM (app.subscriptions s
    LEFT JOIN app.entitlements e ON ((s.owner_id = e.owner_id)))
WHERE (s.owner_id = auth.uid());

-- Grant access
GRANT SELECT ON app.v_user_subscription TO authenticated;