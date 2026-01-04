-- =====================================================
-- SECURITY HARDENING MIGRATION - EU/GDPR Compliance
-- =====================================================

-- 1. FIX DUPLICATE POLICIES
-- Drop duplicate policies that cause confusion

-- daily_context duplicates
DROP POLICY IF EXISTS "Users can delete own context" ON public.daily_context;
DROP POLICY IF EXISTS "Users can insert own context" ON public.daily_context;
DROP POLICY IF EXISTS "Users can update own context" ON public.daily_context;
DROP POLICY IF EXISTS "Users can view own context" ON public.daily_context;

-- Recreate clean policies for daily_context
CREATE POLICY "daily_context_select" ON public.daily_context FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "daily_context_insert" ON public.daily_context FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "daily_context_update" ON public.daily_context FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "daily_context_delete" ON public.daily_context FOR DELETE USING (auth.uid() = owner_id);

-- diary_days duplicates
DROP POLICY IF EXISTS "Users can delete own diary days" ON public.diary_days;
DROP POLICY IF EXISTS "Users can insert own diary days" ON public.diary_days;
DROP POLICY IF EXISTS "Users can update own diary days" ON public.diary_days;
DROP POLICY IF EXISTS "Users can view own diary days" ON public.diary_days;

-- Recreate clean policies for diary_days
CREATE POLICY "diary_days_select" ON public.diary_days FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "diary_days_insert" ON public.diary_days FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "diary_days_update" ON public.diary_days FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "diary_days_delete" ON public.diary_days FOR DELETE USING (auth.uid() = owner_id);

-- meals duplicates
DROP POLICY IF EXISTS "Users can delete own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can insert own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can update own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can view own meals" ON public.meals;

-- Recreate clean policies for meals
CREATE POLICY "meals_select" ON public.meals FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "meals_insert" ON public.meals FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "meals_update" ON public.meals FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "meals_delete" ON public.meals FOR DELETE USING (auth.uid() = owner_id);

-- symptoms duplicates
DROP POLICY IF EXISTS "Users can delete own symptoms" ON public.symptoms;
DROP POLICY IF EXISTS "Users can insert own symptoms" ON public.symptoms;
DROP POLICY IF EXISTS "Users can update own symptoms" ON public.symptoms;
DROP POLICY IF EXISTS "Users can view own symptoms" ON public.symptoms;

-- Recreate clean policies for symptoms
CREATE POLICY "symptoms_select" ON public.symptoms FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "symptoms_insert" ON public.symptoms FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "symptoms_update" ON public.symptoms FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "symptoms_delete" ON public.symptoms FOR DELETE USING (auth.uid() = owner_id);

-- profiles duplicates
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Recreate clean policies for profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- user_consents duplicates
DROP POLICY IF EXISTS "Users can insert own consent" ON public.user_consents;
DROP POLICY IF EXISTS "Users can insert own consents" ON public.user_consents;
DROP POLICY IF EXISTS "Users can update own consent" ON public.user_consents;
DROP POLICY IF EXISTS "Users can update own consents" ON public.user_consents;
DROP POLICY IF EXISTS "Users can view own consent" ON public.user_consents;
DROP POLICY IF EXISTS "Users can view own consents" ON public.user_consents;

-- Recreate clean policies for user_consents
CREATE POLICY "consents_select" ON public.user_consents FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "consents_insert" ON public.user_consents FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "consents_update" ON public.user_consents FOR UPDATE USING (auth.uid() = owner_id);

-- subscriptions duplicates
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

-- Recreate clean policies for subscriptions + ADD UPDATE
CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "subscriptions_insert" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "subscriptions_update" ON public.subscriptions FOR UPDATE USING (auth.uid() = owner_id);

-- entitlements duplicates
DROP POLICY IF EXISTS "Users can view own entitlements" ON public.entitlements;
DROP POLICY IF EXISTS "Users can insert own entitlements" ON public.entitlements;

-- Recreate clean policies for entitlements
CREATE POLICY "entitlements_select" ON public.entitlements FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "entitlements_insert" ON public.entitlements FOR INSERT WITH CHECK (auth.uid() = owner_id);


-- 2. CREATE AUDIT LOG TABLE FOR ADMIN ACTIONS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS for audit logs - only admins can view, insert via server
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_admin_select" ON public.audit_logs 
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Service role can insert (for edge functions)
-- No user insert policy - audit logs are created server-side only


-- 3. CREATE GDPR CONSENT HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.consent_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  consent_type text NOT NULL,
  consent_given boolean NOT NULL,
  consent_version text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.consent_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_history_select" ON public.consent_history 
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "consent_history_insert" ON public.consent_history 
  FOR INSERT WITH CHECK (auth.uid() = owner_id);


-- 4. ADD DATA RETENTION METADATA
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS retention_until date;
ALTER TABLE public.symptoms ADD COLUMN IF NOT EXISTS retention_until date;
ALTER TABLE public.sleep_sessions ADD COLUMN IF NOT EXISTS retention_until date;
ALTER TABLE public.bleeding_logs ADD COLUMN IF NOT EXISTS retention_until date;
ALTER TABLE public.cycle_symptom_logs ADD COLUMN IF NOT EXISTS retention_until date;

-- Set default retention (12 months from creation)
CREATE OR REPLACE FUNCTION public.set_retention_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.retention_until := (NEW.created_at + interval '12 months')::date;
  RETURN NEW;
END;
$$;

-- Apply trigger to health data tables
DROP TRIGGER IF EXISTS set_meals_retention ON public.meals;
CREATE TRIGGER set_meals_retention BEFORE INSERT ON public.meals
  FOR EACH ROW EXECUTE FUNCTION public.set_retention_date();

DROP TRIGGER IF EXISTS set_symptoms_retention ON public.symptoms;
CREATE TRIGGER set_symptoms_retention BEFORE INSERT ON public.symptoms
  FOR EACH ROW EXECUTE FUNCTION public.set_retention_date();

DROP TRIGGER IF EXISTS set_sleep_retention ON public.sleep_sessions;
CREATE TRIGGER set_sleep_retention BEFORE INSERT ON public.sleep_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_retention_date();

DROP TRIGGER IF EXISTS set_bleeding_retention ON public.bleeding_logs;
CREATE TRIGGER set_bleeding_retention BEFORE INSERT ON public.bleeding_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_retention_date();

DROP TRIGGER IF EXISTS set_cycle_symptom_retention ON public.cycle_symptom_logs;
CREATE TRIGGER set_cycle_symptom_retention BEFORE INSERT ON public.cycle_symptom_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_retention_date();


-- 5. ENHANCED DATA EXPORT FUNCTION WITH ALL TABLES
CREATE OR REPLACE FUNCTION public.export_user_data_complete(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only allow users to export their own data
  IF auth.uid() IS NULL OR auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Unauthorized: can only export own data';
  END IF;
  
  SELECT jsonb_build_object(
    'export_metadata', jsonb_build_object(
      'exported_at', NOW(),
      'user_id', user_uuid,
      'format_version', '2.0',
      'gdpr_request_type', 'DSAR'
    ),
    'profile', (SELECT row_to_json(p) FROM public.profiles p WHERE p.id = user_uuid),
    'consent', (SELECT row_to_json(c) FROM public.user_consents c WHERE c.owner_id = user_uuid),
    'consent_history', (SELECT COALESCE(jsonb_agg(row_to_json(ch)), '[]'::jsonb) FROM public.consent_history ch WHERE ch.owner_id = user_uuid),
    'entitlements', (SELECT row_to_json(e) FROM public.entitlements e WHERE e.owner_id = user_uuid),
    'subscription', (SELECT row_to_json(s) FROM public.subscriptions s WHERE s.owner_id = user_uuid),
    'cycle_preferences', (SELECT row_to_json(cp) FROM public.cycle_preferences cp WHERE cp.owner_id = user_uuid),
    'cycles', (SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb) FROM public.cycles c WHERE c.owner_id = user_uuid),
    'bleeding_logs', (SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb) FROM public.bleeding_logs b WHERE b.owner_id = user_uuid),
    'cycle_symptom_logs', (SELECT COALESCE(jsonb_agg(row_to_json(cs)), '[]'::jsonb) FROM public.cycle_symptom_logs cs WHERE cs.owner_id = user_uuid),
    'cycle_predictions', (SELECT COALESCE(jsonb_agg(row_to_json(cp)), '[]'::jsonb) FROM public.cycle_predictions cp WHERE cp.owner_id = user_uuid),
    'fertility_signals', (SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb) FROM public.fertility_signals f WHERE f.owner_id = user_uuid),
    'diary_days', (SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb) FROM public.diary_days d WHERE d.owner_id = user_uuid),
    'meals', (SELECT COALESCE(jsonb_agg(row_to_json(m)), '[]'::jsonb) FROM public.meals m WHERE m.owner_id = user_uuid),
    'symptoms', (SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb) FROM public.symptoms s WHERE s.owner_id = user_uuid),
    'daily_context', (SELECT COALESCE(jsonb_agg(row_to_json(dc)), '[]'::jsonb) FROM public.daily_context dc WHERE dc.owner_id = user_uuid),
    'sleep_sessions', (SELECT COALESCE(jsonb_agg(row_to_json(ss)), '[]'::jsonb) FROM public.sleep_sessions ss WHERE ss.owner_id = user_uuid),
    'ai_usage', (SELECT COALESCE(jsonb_agg(row_to_json(au)), '[]'::jsonb) FROM public.ai_usage au WHERE au.owner_id = user_uuid),
    'community_posts', (SELECT COALESCE(jsonb_agg(row_to_json(cp)), '[]'::jsonb) FROM public.community_posts cp WHERE cp.owner_id = user_uuid),
    'community_comments', (SELECT COALESCE(jsonb_agg(row_to_json(cc)), '[]'::jsonb) FROM public.community_comments cc WHERE cc.owner_id = user_uuid),
    'recipes', (SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) FROM public.recipes r WHERE r.owner_id = user_uuid)
  ) INTO result;
  
  RETURN result;
END;
$$;


-- 6. ENHANCED CLEANUP FUNCTION WITH RETENTION CHECK
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete data past retention date
  DELETE FROM public.meals WHERE retention_until IS NOT NULL AND retention_until < CURRENT_DATE;
  DELETE FROM public.symptoms WHERE retention_until IS NOT NULL AND retention_until < CURRENT_DATE;
  DELETE FROM public.sleep_sessions WHERE retention_until IS NOT NULL AND retention_until < CURRENT_DATE;
  DELETE FROM public.bleeding_logs WHERE retention_until IS NOT NULL AND retention_until < CURRENT_DATE;
  DELETE FROM public.cycle_symptom_logs WHERE retention_until IS NOT NULL AND retention_until < CURRENT_DATE;
  
  -- AI data: 6 months
  DELETE FROM public.ai_usage WHERE created_at < NOW() - INTERVAL '6 months';
  DELETE FROM public.ai_insights_cache WHERE created_at < NOW() - INTERVAL '6 months';
  
  -- Audit logs: 24 months (legal requirement)
  DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '24 months';
  
  -- Orphaned diary days
  DELETE FROM public.diary_days d
  WHERE NOT EXISTS (SELECT 1 FROM public.meals m WHERE m.day_id = d.id)
    AND NOT EXISTS (SELECT 1 FROM public.symptoms s WHERE s.day_id = d.id)
    AND d.created_at < NOW() - INTERVAL '12 months';
  
  RAISE NOTICE 'GDPR data cleanup completed at %', NOW();
END;
$$;


-- 7. REVOKE UNNECESSARY PRIVILEGES (defense in depth)
-- Revoke direct table access from anon role
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant back only what's needed via RLS
GRANT SELECT ON public.symptom_catalog TO anon;
GRANT SELECT ON public.exercises TO anon;
GRANT SELECT ON public.meditations TO anon;
GRANT SELECT ON public.recipes TO anon;
GRANT SELECT ON public.community_posts TO anon;
GRANT SELECT ON public.community_comments TO anon;

-- Authenticated users get full RLS-protected access
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;