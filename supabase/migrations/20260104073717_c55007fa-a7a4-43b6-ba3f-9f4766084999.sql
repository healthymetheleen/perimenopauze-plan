-- =============================================================
-- SECURITY HARDENING: Revoke anon permissions, grant only authenticated
-- =============================================================

-- Revoke all permissions from anon role on all user tables
REVOKE ALL ON public.ai_usage FROM anon;
REVOKE ALL ON public.bleeding_logs FROM anon;
REVOKE ALL ON public.cycle_predictions FROM anon;
REVOKE ALL ON public.cycle_preferences FROM anon;
REVOKE ALL ON public.cycle_symptom_logs FROM anon;
REVOKE ALL ON public.cycles FROM anon;
REVOKE ALL ON public.daily_context FROM anon;
REVOKE ALL ON public.diary_days FROM anon;
REVOKE ALL ON public.entitlements FROM anon;
REVOKE ALL ON public.fertility_signals FROM anon;
REVOKE ALL ON public.meals FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.sleep_sessions FROM anon;
REVOKE ALL ON public.subscriptions FROM anon;
REVOKE ALL ON public.symptoms FROM anon;
REVOKE ALL ON public.user_consents FROM anon;

-- Revoke anon from views (extra safety)
REVOKE ALL ON public.v_daily_scores FROM anon;
REVOKE ALL ON public.v_symptom_catalog FROM anon;

-- Grant only to authenticated users (RLS will further restrict per-user)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bleeding_logs TO authenticated;
GRANT SELECT, INSERT ON public.cycle_predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cycle_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_symptom_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_context TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diary_days TO authenticated;
GRANT SELECT, INSERT ON public.entitlements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fertility_signals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sleep_sessions TO authenticated;
GRANT SELECT, INSERT ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.symptoms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_consents TO authenticated;

-- Views for authenticated only
GRANT SELECT ON public.v_daily_scores TO authenticated;
GRANT SELECT ON public.v_symptom_catalog TO authenticated;

-- Recipes: keep public read for published, but only authenticated can manage
REVOKE INSERT, UPDATE, DELETE ON public.recipes FROM anon;
GRANT SELECT ON public.recipes TO anon; -- Published recipes are public
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;

-- Symptom catalog: public read (reference data)
GRANT SELECT ON public.symptom_catalog TO anon;
GRANT SELECT ON public.symptom_catalog TO authenticated;

-- =============================================================
-- CREATE API SCHEMA (for future use when exposed schemas are changed)
-- =============================================================
CREATE SCHEMA IF NOT EXISTS api;

-- Grant usage on api schema to authenticated users
GRANT USAGE ON SCHEMA api TO authenticated;

-- Create views in api schema that reference public tables
-- This allows future migration to api-only exposure without breaking data

CREATE OR REPLACE VIEW api.meal_entries AS
SELECT 
  id,
  owner_id as user_id,
  day_id,
  time_local,
  kcal,
  protein_g,
  carbs_g,
  fat_g,
  fiber_g,
  ultra_processed_level,
  quality_flags as payload,
  created_at,
  updated_at
FROM public.meals
WHERE owner_id = auth.uid();

CREATE OR REPLACE VIEW api.sleep_sessions AS
SELECT *
FROM public.sleep_sessions
WHERE owner_id = auth.uid();

CREATE OR REPLACE VIEW api.cycle_events AS
SELECT 
  id,
  owner_id as user_id,
  start_date,
  end_date,
  computed_cycle_length,
  is_anovulatory,
  notes,
  created_at,
  updated_at
FROM public.cycles
WHERE owner_id = auth.uid();

CREATE OR REPLACE VIEW api.symptoms_daily AS
SELECT *
FROM public.symptoms
WHERE owner_id = auth.uid();

CREATE OR REPLACE VIEW api.daily_context AS
SELECT *
FROM public.daily_context
WHERE owner_id = auth.uid();

-- Grant access to api views
GRANT SELECT ON api.meal_entries TO authenticated;
GRANT SELECT ON api.sleep_sessions TO authenticated;
GRANT SELECT ON api.cycle_events TO authenticated;
GRANT SELECT ON api.symptoms_daily TO authenticated;
GRANT SELECT ON api.daily_context TO authenticated;

-- =============================================================
-- Add unique constraints for upsert operations (if not exists)
-- =============================================================

-- bleeding_logs: unique on owner_id + log_date for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bleeding_logs_owner_date_unique'
  ) THEN
    ALTER TABLE public.bleeding_logs ADD CONSTRAINT bleeding_logs_owner_date_unique UNIQUE (owner_id, log_date);
  END IF;
END $$;

-- cycle_symptom_logs: unique on owner_id + log_date for upsert  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cycle_symptom_logs_owner_date_unique'
  ) THEN
    ALTER TABLE public.cycle_symptom_logs ADD CONSTRAINT cycle_symptom_logs_owner_date_unique UNIQUE (owner_id, log_date);
  END IF;
END $$;

-- cycle_preferences: unique on owner_id for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cycle_preferences_owner_unique'
  ) THEN
    ALTER TABLE public.cycle_preferences ADD CONSTRAINT cycle_preferences_owner_unique UNIQUE (owner_id);
  END IF;
END $$;