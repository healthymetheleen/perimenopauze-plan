-- ============================================
-- FASE 1: HormoonBalans Dagboek Database Schema
-- ============================================

-- 1. Create app schema
CREATE SCHEMA IF NOT EXISTS app;

-- 2. Create enums
CREATE TYPE app.delivery_channel AS ENUM ('in_app', 'push', 'email');
CREATE TYPE app.notification_status AS ENUM ('queued', 'processing', 'sent', 'failed');
CREATE TYPE app.redaction_status AS ENUM ('raw', 'redacted', 'blocked');
CREATE TYPE app.cycle_phase AS ENUM ('menstrual', 'follicular', 'ovulatory', 'luteal', 'unknown');

-- ============================================
-- 3. TABLES
-- ============================================

-- 3.1 Profiles
CREATE TABLE app.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 User Preferences
CREATE TABLE app.user_preferences (
    owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    timezone TEXT NOT NULL DEFAULT 'Europe/Amsterdam',
    digest_enabled BOOLEAN NOT NULL DEFAULT true,
    digest_time_local TIME NOT NULL DEFAULT '08:30:00',
    delivery_channel app.delivery_channel NOT NULL DEFAULT 'in_app',
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 Diary Days
CREATE TABLE app.diary_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_date DATE NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Europe/Amsterdam',
    data_quality JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(owner_id, day_date)
);

-- Composite unique for FK references
CREATE UNIQUE INDEX idx_diary_days_id_owner ON app.diary_days(id, owner_id);

-- 3.4 Symptom Catalog (read-only reference table)
CREATE TABLE app.symptom_catalog (
    code TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    label_nl TEXT NOT NULL,
    description_nl TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 3.5 Meals
CREATE TABLE app.meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_id UUID NOT NULL,
    time_local TIME,
    source TEXT NOT NULL DEFAULT 'manual',
    kcal NUMERIC,
    protein_g NUMERIC,
    carbs_g NUMERIC,
    fat_g NUMERIC,
    fiber_g NUMERIC,
    ultra_processed_level SMALLINT CHECK (ultra_processed_level >= 0 AND ultra_processed_level <= 3),
    quality_flags JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (day_id, owner_id) REFERENCES app.diary_days(id, owner_id) ON DELETE CASCADE
);

CREATE INDEX idx_meals_owner_day ON app.meals(owner_id, day_id);

-- 3.6 Symptoms
CREATE TABLE app.symptoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_id UUID NOT NULL,
    symptom_code TEXT NOT NULL REFERENCES app.symptom_catalog(code),
    severity_0_10 SMALLINT NOT NULL CHECK (severity_0_10 >= 0 AND severity_0_10 <= 10),
    timing TEXT,
    tags JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (day_id, owner_id) REFERENCES app.diary_days(id, owner_id) ON DELETE CASCADE
);

CREATE INDEX idx_symptoms_owner_day ON app.symptoms(owner_id, day_id);
CREATE INDEX idx_symptoms_code ON app.symptoms(symptom_code);

-- 3.7 Daily Context
CREATE TABLE app.daily_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_id UUID NOT NULL,
    sleep_duration_h NUMERIC,
    sleep_quality_0_10 SMALLINT CHECK (sleep_quality_0_10 >= 0 AND sleep_quality_0_10 <= 10),
    stress_0_10 SMALLINT CHECK (stress_0_10 >= 0 AND stress_0_10 <= 10),
    steps INTEGER,
    cycle_day SMALLINT CHECK (cycle_day >= 1 AND cycle_day <= 60),
    cycle_phase app.cycle_phase,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(owner_id, day_id),
    FOREIGN KEY (day_id, owner_id) REFERENCES app.diary_days(id, owner_id) ON DELETE CASCADE
);

-- 3.8 Notes Private
CREATE TABLE app.notes_private (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_id UUID NOT NULL,
    content TEXT CHECK (length(content) <= 4000),
    redaction_status app.redaction_status NOT NULL DEFAULT 'raw',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (day_id, owner_id) REFERENCES app.diary_days(id, owner_id) ON DELETE CASCADE
);

CREATE INDEX idx_notes_owner_day ON app.notes_private(owner_id, day_id);

-- 3.9 Copy Catalog (read-only reference table)
CREATE TABLE app.copy_catalog (
    code TEXT PRIMARY KEY,
    title_nl TEXT NOT NULL,
    body_nl TEXT NOT NULL,
    action_title_nl TEXT,
    action_body_nl TEXT,
    severity SMALLINT NOT NULL DEFAULT 1 CHECK (severity >= 1 AND severity <= 3),
    category TEXT NOT NULL DEFAULT 'general',
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 3.10 Notifications
CREATE TABLE app.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    channel app.delivery_channel NOT NULL DEFAULT 'in_app',
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status app.notification_status NOT NULL DEFAULT 'queued',
    attempts SMALLINT NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_owner ON app.notifications(owner_id, created_at DESC);
CREATE INDEX idx_notifications_status ON app.notifications(status, scheduled_at);

-- 3.11 Audit Events
CREATE TABLE app.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_owner ON app.audit_events(owner_id, created_at DESC);

-- ============================================
-- 4. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE app.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.diary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.symptom_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.daily_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.notes_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.copy_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- 5.1 Profiles - owner only
CREATE POLICY "Users can view own profile" ON app.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON app.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON app.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can delete own profile" ON app.profiles FOR DELETE USING (id = auth.uid());

-- 5.2 User Preferences - owner only
CREATE POLICY "Users can view own preferences" ON app.user_preferences FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own preferences" ON app.user_preferences FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own preferences" ON app.user_preferences FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own preferences" ON app.user_preferences FOR DELETE USING (owner_id = auth.uid());

-- 5.3 Diary Days - owner only
CREATE POLICY "Users can view own diary days" ON app.diary_days FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own diary days" ON app.diary_days FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own diary days" ON app.diary_days FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own diary days" ON app.diary_days FOR DELETE USING (owner_id = auth.uid());

-- 5.4 Symptom Catalog - read only for authenticated
CREATE POLICY "Authenticated users can read symptom catalog" ON app.symptom_catalog FOR SELECT TO authenticated USING (true);

-- 5.5 Meals - owner only
CREATE POLICY "Users can view own meals" ON app.meals FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own meals" ON app.meals FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own meals" ON app.meals FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own meals" ON app.meals FOR DELETE USING (owner_id = auth.uid());

-- 5.6 Symptoms - owner only
CREATE POLICY "Users can view own symptoms" ON app.symptoms FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own symptoms" ON app.symptoms FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own symptoms" ON app.symptoms FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own symptoms" ON app.symptoms FOR DELETE USING (owner_id = auth.uid());

-- 5.7 Daily Context - owner only
CREATE POLICY "Users can view own context" ON app.daily_context FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own context" ON app.daily_context FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own context" ON app.daily_context FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own context" ON app.daily_context FOR DELETE USING (owner_id = auth.uid());

-- 5.8 Notes Private - owner only
CREATE POLICY "Users can view own notes" ON app.notes_private FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own notes" ON app.notes_private FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own notes" ON app.notes_private FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own notes" ON app.notes_private FOR DELETE USING (owner_id = auth.uid());

-- 5.9 Copy Catalog - read only for authenticated
CREATE POLICY "Authenticated users can read copy catalog" ON app.copy_catalog FOR SELECT TO authenticated USING (true);

-- 5.10 Notifications - restricted update
CREATE POLICY "Users can view own notifications" ON app.notifications FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can update own notifications read status" ON app.notifications FOR UPDATE USING (owner_id = auth.uid());

-- 5.11 Audit Events - owner only select
CREATE POLICY "Users can view own audit events" ON app.audit_events FOR SELECT USING (owner_id = auth.uid());

-- ============================================
-- 6. COLUMN-LEVEL GRANTS FOR NOTIFICATIONS
-- ============================================

-- Revoke all from authenticated on notifications, then grant specific
REVOKE ALL ON app.notifications FROM authenticated;
GRANT SELECT ON app.notifications TO authenticated;
GRANT UPDATE (is_read, read_at) ON app.notifications TO authenticated;

-- ============================================
-- 7. SEED DATA - SYMPTOM CATALOG
-- ============================================

INSERT INTO app.symptom_catalog (code, domain, label_nl, description_nl) VALUES
-- Vasomotor
('hot_flashes', 'vasomotor', 'Opvliegers', 'Plotselinge warmtegolven, vaak met transpiratie'),
('night_sweats', 'vasomotor', 'Nachtelijk zweten', 'Overmatig zweten tijdens de nacht'),

-- Sleep
('sleep_onset_delay', 'sleep', 'Moeite met inslapen', 'Langer dan 30 minuten nodig om in slaap te vallen'),
('night_awakenings', 'sleep', 'Nachtelijk wakker worden', 'Meerdere keren per nacht wakker worden'),
('early_morning_waking', 'sleep', 'Vroeg wakker worden', 'Te vroeg wakker worden en niet meer kunnen slapen'),
('unrefreshing_sleep', 'sleep', 'Niet uitgerust wakker worden', 'Ondanks voldoende slaap niet uitgerust voelen'),

-- Mood
('irritability', 'mood', 'Prikkelbaarheid', 'Sneller geïrriteerd of gefrustreerd'),
('anxiety', 'mood', 'Angstgevoelens', 'Gevoelens van onrust of bezorgdheid'),
('low_mood', 'mood', 'Somberheid', 'Neerslachtige stemming of verminderde interesse'),
('mood_swings', 'mood', 'Stemmingswisselingen', 'Snelle wisselingen in emoties'),

-- Cognitive
('brain_fog', 'cognitive', 'Hersenmist', 'Wazig denken of moeite met helder nadenken'),
('poor_focus', 'cognitive', 'Concentratieproblemen', 'Moeite met focussen op taken'),
('memory_lapses', 'cognitive', 'Vergeetachtigheid', 'Moeite met het onthouden van dingen'),

-- Energy
('fatigue', 'energy', 'Vermoeidheid', 'Aanhoudende moeheid gedurende de dag'),
('afternoon_crash', 'energy', 'Middagdip', 'Sterke energiedaling in de middag'),
('low_morning_energy', 'energy', 'Lage ochtendenergie', 'Moeite met op gang komen in de ochtend'),

-- Metabolic
('cravings_sweet', 'metabolic', 'Trek in zoet', 'Sterke behoefte aan zoete voeding'),
('blood_sugar_swings', 'metabolic', 'Bloedsuikerschommelingen', 'Wisselende energieniveaus gerelateerd aan eten'),
('water_retention', 'metabolic', 'Vochtophoping', 'Vasthouden van vocht, gezwollen gevoel'),
('weight_gain', 'metabolic', 'Gewichtstoename', 'Onverklaarbare toename in gewicht'),

-- Menstrual
('irregular_cycle', 'menstrual', 'Onregelmatige cyclus', 'Wisselende cycluslengte of timing'),
('spotting', 'menstrual', 'Tussentijds bloedverlies', 'Licht bloedverlies buiten de menstruatie'),
('heavy_bleeding', 'menstrual', 'Heftige menstruatie', 'Meer bloedverlies dan voorheen'),
('menstrual_cramps', 'menstrual', 'Menstruatiekrampen', 'Pijnlijke krampen tijdens menstruatie'),
('pms', 'menstrual', 'PMS klachten', 'Klachten in de week voor de menstruatie'),
('breast_tenderness', 'menstrual', 'Gevoelige borsten', 'Pijnlijke of gespannen borsten'),

-- Digestive
('bloating', 'digestive', 'Opgeblazen gevoel', 'Opgezette buik of vol gevoel'),
('constipation', 'digestive', 'Obstipatie', 'Moeite met stoelgang'),
('reflux', 'digestive', 'Reflux of zuurbranden', 'Brandend gevoel in de slokdarm'),

-- Urogenital
('low_libido', 'urogenital', 'Verminderd libido', 'Verminderde zin in intimiteit'),
('vaginal_dryness', 'urogenital', 'Vaginale droogheid', 'Droogheid of ongemak'),
('urinary_urgency', 'urogenital', 'Aandrang om te plassen', 'Frequent of dringend moeten plassen'),

-- Dermatological
('hair_shedding', 'dermatological', 'Haaruitval', 'Meer haarverlies dan normaal'),
('dry_skin', 'dermatological', 'Droge huid', 'Schrale of schilferige huid'),
('acne', 'dermatological', 'Acne', 'Puistjes of onzuiverheden');

-- ============================================
-- 8. SEED DATA - COPY CATALOG
-- ============================================

INSERT INTO app.copy_catalog (code, title_nl, body_nl, action_title_nl, action_body_nl, severity, category) VALUES
('low_protein', 'Minder eiwit dan optimaal', 'Eiwit helpt je bloedsuiker stabiel te houden en ondersteunt je spieren en hormoonproductie. Je hebt gisteren minder eiwit gegeten dan je lichaam prettig vindt.', 'Kleine stap', 'Voeg bij je volgende maaltijd een extra eiwitbron toe, zoals een gekookt ei, wat noten of een stukje kaas.', 2, 'nutrition'),

('low_fiber', 'Minder vezels dan optimaal', 'Vezels ondersteunen je darmen en helpen hormonen af te voeren. Je vezelinname was gisteren aan de lage kant.', 'Kleine stap', 'Voeg wat extra groenten toe aan je warme maaltijd of kies voor volkoren in plaats van wit.', 2, 'nutrition'),

('many_eating_moments', 'Veel eetmomenten', 'Je hebt gisteren relatief vaak gegeten. Dit kan je spijsvertering en bloedsuiker meer belasten.', 'Kleine stap', 'Kijk of je twee eetmomenten kunt samenvoegen tot één meer voedzame maaltijd.', 1, 'timing'),

('high_carb_without_protein', 'Koolhydraten zonder eiwit', 'Een of meer maaltijden bevatten veel koolhydraten maar weinig eiwit. Dit kan bloedsuikerschommelingen veroorzaken.', 'Kleine stap', 'Combineer koolhydraten altijd met een eiwitbron voor stabielere energie.', 2, 'nutrition'),

('late_eating', 'Laat gegeten', 'Je laatste maaltijd was vrij laat. Dit kan je nachtrust en hormoonbalans beïnvloeden.', 'Kleine stap', 'Probeer je laatste maaltijd 3 uur voor het slapen te plannen.', 2, 'timing'),

('very_low_kcal', 'Weinig gegeten', 'Je hebt gisteren minder energie binnengekregen dan je lichaam nodig heeft. Dit kan stress op je systeem veroorzaken.', 'Kleine stap', 'Zorg dat je bij elke maaltijd voldoende eet om je energiebehoefte te dekken.', 3, 'nutrition'),

('very_high_kcal', 'Veel gegeten', 'Je hebt gisteren meer energie binnengekregen dan gemiddeld. Dit hoeft niet verkeerd te zijn, maar is goed om te weten.', NULL, NULL, 1, 'nutrition'),

('sleep_low', 'Korte nachtrust', 'Je hebt minder geslapen dan optimaal. Slaap is cruciaal voor hormoonherstel.', 'Kleine stap', 'Ga vanavond 30 minuten eerder naar bed en vermijd schermen in het laatste uur.', 3, 'context'),

('stress_high', 'Hogere stress', 'Je stressniveau was gisteren aan de hoge kant. Dit beïnvloedt direct je hormoonbalans.', 'Kleine stap', 'Neem vandaag 5 minuten voor een ademhalingsoefening of korte wandeling.', 2, 'context'),

('reduce_ultra_processed', 'Ultrabewerkte producten', 'Je hebt gisteren relatief veel ultrabewerkte producten gegeten. Deze kunnen je darmen en hormonen belasten.', 'Kleine stap', 'Vervang één ultrabewerkt product door een minimaal bewerkt alternatief.', 2, 'nutrition');

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to get or create diary day
CREATE OR REPLACE FUNCTION app.get_or_create_diary_day(p_date DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
DECLARE
    v_day_id UUID;
BEGIN
    SELECT id INTO v_day_id 
    FROM app.diary_days 
    WHERE owner_id = auth.uid() AND day_date = p_date;
    
    IF v_day_id IS NULL THEN
        INSERT INTO app.diary_days (owner_id, day_date)
        VALUES (auth.uid(), p_date)
        RETURNING id INTO v_day_id;
    END IF;
    
    RETURN v_day_id;
END;
$$;

-- ============================================
-- 10. VIEWS
-- ============================================

-- 10.1 Daily Summary View
CREATE OR REPLACE VIEW app.v_daily_summary AS
SELECT 
    dd.id AS day_id,
    dd.owner_id,
    dd.day_date,
    dd.timezone,
    dd.data_quality,
    -- Intake aggregates
    COALESCE(m.meals_count, 0) AS meals_count,
    COALESCE(m.kcal_total, 0) AS kcal_total,
    COALESCE(m.protein_g, 0) AS protein_g,
    COALESCE(m.fiber_g, 0) AS fiber_g,
    COALESCE(m.carbs_g, 0) AS carbs_g,
    COALESCE(m.fat_g, 0) AS fat_g,
    m.first_meal_time,
    m.last_meal_time,
    m.eating_window_h,
    m.avg_ultra_processed,
    -- Late eating flag (after 21:00)
    CASE WHEN m.last_meal_time > '21:00:00'::TIME THEN true ELSE false END AS late_eating_flag,
    -- Many eating moments flag
    CASE WHEN COALESCE(m.meals_count, 0) > 5 THEN true ELSE false END AS many_eating_moments_flag,
    -- Context
    dc.sleep_duration_h,
    dc.sleep_quality_0_10,
    dc.stress_0_10,
    dc.steps,
    dc.cycle_day,
    dc.cycle_phase,
    -- Symptoms array
    COALESCE(s.symptoms_array, '[]'::JSONB) AS symptoms,
    dd.created_at,
    dd.updated_at
FROM app.diary_days dd
LEFT JOIN (
    SELECT 
        day_id,
        COUNT(*)::INT AS meals_count,
        SUM(kcal) AS kcal_total,
        SUM(protein_g) AS protein_g,
        SUM(fiber_g) AS fiber_g,
        SUM(carbs_g) AS carbs_g,
        SUM(fat_g) AS fat_g,
        MIN(time_local) AS first_meal_time,
        MAX(time_local) AS last_meal_time,
        EXTRACT(EPOCH FROM (MAX(time_local) - MIN(time_local))) / 3600 AS eating_window_h,
        AVG(ultra_processed_level) AS avg_ultra_processed
    FROM app.meals
    GROUP BY day_id
) m ON dd.id = m.day_id
LEFT JOIN app.daily_context dc ON dd.id = dc.day_id AND dd.owner_id = dc.owner_id
LEFT JOIN (
    SELECT 
        day_id,
        jsonb_agg(jsonb_build_object('code', symptom_code, 'severity', severity_0_10)) AS symptoms_array
    FROM app.symptoms
    GROUP BY day_id
) s ON dd.id = s.day_id
WHERE dd.owner_id = auth.uid();

-- 10.2 Daily Scores View
CREATE OR REPLACE VIEW app.v_daily_scores AS
SELECT 
    ds.day_id,
    ds.owner_id,
    ds.day_date,
    -- Calculate score (0-10, start at 10 and subtract for issues)
    GREATEST(0, 10 
        - CASE WHEN ds.protein_g < 50 THEN 1.5 ELSE 0 END
        - CASE WHEN ds.fiber_g < 20 THEN 1 ELSE 0 END
        - CASE WHEN ds.many_eating_moments_flag THEN 1 ELSE 0 END
        - CASE WHEN ds.late_eating_flag THEN 1 ELSE 0 END
        - CASE WHEN ds.kcal_total > 0 AND ds.kcal_total < 1200 THEN 2 ELSE 0 END
        - CASE WHEN ds.kcal_total > 2500 THEN 0.5 ELSE 0 END
        - CASE WHEN ds.sleep_quality_0_10 IS NOT NULL AND ds.sleep_quality_0_10 < 5 THEN 1 ELSE 0 END
        - CASE WHEN ds.stress_0_10 IS NOT NULL AND ds.stress_0_10 > 7 THEN 1 ELSE 0 END
    )::NUMERIC(3,1) AS day_score,
    -- Score reasons array
    ARRAY_REMOVE(ARRAY[
        CASE WHEN ds.protein_g < 50 THEN 'low_protein' END,
        CASE WHEN ds.fiber_g < 20 THEN 'low_fiber' END,
        CASE WHEN ds.many_eating_moments_flag THEN 'many_eating_moments' END,
        CASE WHEN ds.late_eating_flag THEN 'late_eating' END,
        CASE WHEN ds.kcal_total > 0 AND ds.kcal_total < 1200 THEN 'very_low_kcal' END,
        CASE WHEN ds.kcal_total > 2500 THEN 'very_high_kcal' END,
        CASE WHEN ds.sleep_quality_0_10 IS NOT NULL AND ds.sleep_quality_0_10 < 5 THEN 'sleep_low' END,
        CASE WHEN ds.stress_0_10 IS NOT NULL AND ds.stress_0_10 > 7 THEN 'stress_high' END
    ], NULL) AS score_reasons,
    -- Include summary data
    ds.meals_count,
    ds.kcal_total,
    ds.protein_g,
    ds.fiber_g,
    ds.eating_window_h,
    ds.first_meal_time,
    ds.last_meal_time,
    ds.sleep_duration_h,
    ds.sleep_quality_0_10,
    ds.stress_0_10,
    ds.steps,
    ds.cycle_phase,
    ds.symptoms
FROM app.v_daily_summary ds;

-- 10.3 Trends 7 Days View
CREATE OR REPLACE VIEW app.v_trends_7d AS
SELECT 
    ds.day_date,
    ds.day_score,
    ds.protein_g,
    ds.fiber_g,
    ds.meals_count,
    ds.sleep_quality_0_10,
    ds.stress_0_10,
    ds.cycle_phase
FROM app.v_daily_scores ds
WHERE ds.day_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY ds.day_date DESC;

-- 10.4 Symptom Patterns 14 Days View
CREATE OR REPLACE VIEW app.v_symptom_patterns_14d AS
WITH symptom_days AS (
    SELECT 
        sy.symptom_code,
        sy.severity_0_10,
        ds.protein_g,
        ds.fiber_g,
        ds.late_eating_flag,
        ds.many_eating_moments_flag
    FROM app.symptoms sy
    JOIN app.diary_days dd ON sy.day_id = dd.id AND sy.owner_id = dd.owner_id
    JOIN app.v_daily_summary ds ON dd.id = ds.day_id
    WHERE dd.owner_id = auth.uid()
    AND dd.day_date >= CURRENT_DATE - INTERVAL '14 days'
),
high_severity AS (
    SELECT 
        symptom_code,
        AVG(protein_g) AS avg_protein,
        AVG(fiber_g) AS avg_fiber,
        AVG(CASE WHEN late_eating_flag THEN 1 ELSE 0 END) AS late_eating_rate,
        AVG(CASE WHEN many_eating_moments_flag THEN 1 ELSE 0 END) AS many_eating_rate,
        COUNT(*) AS count_high
    FROM symptom_days
    WHERE severity_0_10 >= 6
    GROUP BY symptom_code
),
low_severity AS (
    SELECT 
        symptom_code,
        AVG(protein_g) AS avg_protein,
        AVG(fiber_g) AS avg_fiber,
        AVG(CASE WHEN late_eating_flag THEN 1 ELSE 0 END) AS late_eating_rate,
        AVG(CASE WHEN many_eating_moments_flag THEN 1 ELSE 0 END) AS many_eating_rate,
        COUNT(*) AS count_low
    FROM symptom_days
    WHERE severity_0_10 < 6
    GROUP BY symptom_code
)
SELECT 
    sc.code AS symptom_code,
    sc.label_nl,
    sc.domain,
    COALESCE(h.count_high, 0) AS days_high_severity,
    COALESCE(l.count_low, 0) AS days_low_severity,
    ROUND(COALESCE(h.avg_protein, 0)::NUMERIC, 1) AS protein_g_high,
    ROUND(COALESCE(l.avg_protein, 0)::NUMERIC, 1) AS protein_g_low,
    ROUND(COALESCE(h.avg_fiber, 0)::NUMERIC, 1) AS fiber_g_high,
    ROUND(COALESCE(l.avg_fiber, 0)::NUMERIC, 1) AS fiber_g_low,
    ROUND(COALESCE(h.late_eating_rate, 0)::NUMERIC * 100, 0) AS late_eating_pct_high,
    ROUND(COALESCE(l.late_eating_rate, 0)::NUMERIC * 100, 0) AS late_eating_pct_low
FROM app.symptom_catalog sc
LEFT JOIN high_severity h ON sc.code = h.symptom_code
LEFT JOIN low_severity l ON sc.code = l.symptom_code
WHERE (h.count_high > 0 OR l.count_low > 0);

-- ============================================
-- 11. API FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION app.get_daily_summary(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'date', day_date,
        'score', day_score,
        'score_reasons', score_reasons,
        'intake', jsonb_build_object(
            'meals_count', meals_count,
            'kcal', kcal_total,
            'protein_g', protein_g,
            'fiber_g', fiber_g
        ),
        'timing', jsonb_build_object(
            'first_meal', first_meal_time,
            'last_meal', last_meal_time,
            'eating_window_h', eating_window_h
        ),
        'context', jsonb_build_object(
            'sleep_duration_h', sleep_duration_h,
            'sleep_quality', sleep_quality_0_10,
            'stress', stress_0_10,
            'steps', steps,
            'cycle_phase', cycle_phase
        ),
        'symptoms', symptoms
    ) INTO v_result
    FROM app.v_daily_scores
    WHERE day_date = p_date;
    
    RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;

-- ============================================
-- 12. UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION app.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON app.profiles FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_preferences_updated_at BEFORE UPDATE ON app.user_preferences FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_diary_days_updated_at BEFORE UPDATE ON app.diary_days FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_meals_updated_at BEFORE UPDATE ON app.meals FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_symptoms_updated_at BEFORE UPDATE ON app.symptoms FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_context_updated_at BEFORE UPDATE ON app.daily_context FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_notes_updated_at BEFORE UPDATE ON app.notes_private FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ============================================
-- 13. EXPOSE APP SCHEMA
-- ============================================

GRANT USAGE ON SCHEMA app TO anon, authenticated;
GRANT SELECT ON app.symptom_catalog TO anon, authenticated;
GRANT SELECT ON app.copy_catalog TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA app TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO authenticated;

-- Revoke specific permissions on notifications (already done above, but ensure)
REVOKE INSERT, DELETE ON app.notifications FROM authenticated;