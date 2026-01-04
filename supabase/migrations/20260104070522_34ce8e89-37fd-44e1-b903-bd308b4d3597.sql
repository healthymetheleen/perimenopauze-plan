-- Add consent versioning columns to user_consents table
ALTER TABLE public.user_consents 
ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS accepted_ai_processing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '1.0';

-- Add comment explaining consent versioning
COMMENT ON COLUMN public.user_consents.consent_version IS 'Version of the consent form the user accepted';
COMMENT ON COLUMN public.user_consents.accepted_ai_processing IS 'Explicit consent for AI-assisted analysis';
COMMENT ON COLUMN public.user_consents.privacy_policy_version IS 'Version of privacy policy accepted';
COMMENT ON COLUMN public.user_consents.terms_version IS 'Version of terms and conditions accepted';

-- Create a function to clean up old data (data retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete meals older than 12 months
  DELETE FROM public.meals 
  WHERE created_at < NOW() - INTERVAL '12 months';
  
  -- Delete symptoms older than 12 months
  DELETE FROM public.symptoms 
  WHERE created_at < NOW() - INTERVAL '12 months';
  
  -- Delete daily_context older than 12 months
  DELETE FROM public.daily_context 
  WHERE created_at < NOW() - INTERVAL '12 months';
  
  -- Delete diary_days older than 12 months (only if no related data)
  DELETE FROM public.diary_days d
  WHERE d.created_at < NOW() - INTERVAL '12 months'
    AND NOT EXISTS (SELECT 1 FROM public.meals m WHERE m.day_id = d.id)
    AND NOT EXISTS (SELECT 1 FROM public.symptoms s WHERE s.day_id = d.id);
  
  -- Delete AI usage logs older than 6 months
  DELETE FROM public.ai_usage 
  WHERE created_at < NOW() - INTERVAL '6 months';
  
  -- Delete sleep sessions older than 12 months
  DELETE FROM public.sleep_sessions 
  WHERE created_at < NOW() - INTERVAL '12 months';
  
  -- Delete cycle symptom logs older than 12 months
  DELETE FROM public.cycle_symptom_logs 
  WHERE created_at < NOW() - INTERVAL '12 months';
  
  -- Delete bleeding logs older than 12 months
  DELETE FROM public.bleeding_logs 
  WHERE created_at < NOW() - INTERVAL '12 months';
  
  -- Keep cycle predictions only for the last 6 months
  DELETE FROM public.cycle_predictions 
  WHERE created_at < NOW() - INTERVAL '6 months';
  
  RAISE NOTICE 'Data cleanup completed at %', NOW();
END;
$$;

-- Create a function to export all user data (GDPR)
CREATE OR REPLACE FUNCTION public.export_user_data(user_uuid UUID)
RETURNS JSONB
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
    'exported_at', NOW(),
    'user_id', user_uuid,
    'profile', (SELECT row_to_json(p) FROM public.profiles p WHERE p.id = user_uuid),
    'consent', (SELECT row_to_json(c) FROM public.user_consents c WHERE c.owner_id = user_uuid),
    'entitlements', (SELECT row_to_json(e) FROM public.entitlements e WHERE e.owner_id = user_uuid),
    'subscription', (SELECT row_to_json(s) FROM public.subscriptions s WHERE s.owner_id = user_uuid),
    'cycle_preferences', (SELECT row_to_json(cp) FROM public.cycle_preferences cp WHERE cp.owner_id = user_uuid),
    'cycles', (SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb) FROM public.cycles c WHERE c.owner_id = user_uuid),
    'bleeding_logs', (SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb) FROM public.bleeding_logs b WHERE b.owner_id = user_uuid),
    'cycle_symptom_logs', (SELECT COALESCE(jsonb_agg(row_to_json(cs)), '[]'::jsonb) FROM public.cycle_symptom_logs cs WHERE cs.owner_id = user_uuid),
    'fertility_signals', (SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb) FROM public.fertility_signals f WHERE f.owner_id = user_uuid),
    'diary_days', (SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb) FROM public.diary_days d WHERE d.owner_id = user_uuid),
    'meals', (SELECT COALESCE(jsonb_agg(row_to_json(m)), '[]'::jsonb) FROM public.meals m WHERE m.owner_id = user_uuid),
    'symptoms', (SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb) FROM public.symptoms s WHERE s.owner_id = user_uuid),
    'daily_context', (SELECT COALESCE(jsonb_agg(row_to_json(dc)), '[]'::jsonb) FROM public.daily_context dc WHERE dc.owner_id = user_uuid),
    'sleep_sessions', (SELECT COALESCE(jsonb_agg(row_to_json(ss)), '[]'::jsonb) FROM public.sleep_sessions ss WHERE ss.owner_id = user_uuid)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create a function to delete all user data (GDPR right to be forgotten)
CREATE OR REPLACE FUNCTION public.delete_user_data(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to delete their own data
  IF auth.uid() IS NULL OR auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Unauthorized: can only delete own data';
  END IF;
  
  -- Delete in order respecting foreign keys
  DELETE FROM public.meals WHERE owner_id = user_uuid;
  DELETE FROM public.symptoms WHERE owner_id = user_uuid;
  DELETE FROM public.daily_context WHERE owner_id = user_uuid;
  DELETE FROM public.diary_days WHERE owner_id = user_uuid;
  DELETE FROM public.sleep_sessions WHERE owner_id = user_uuid;
  DELETE FROM public.cycle_symptom_logs WHERE owner_id = user_uuid;
  DELETE FROM public.bleeding_logs WHERE owner_id = user_uuid;
  DELETE FROM public.fertility_signals WHERE owner_id = user_uuid;
  DELETE FROM public.cycle_predictions WHERE owner_id = user_uuid;
  DELETE FROM public.cycles WHERE owner_id = user_uuid;
  DELETE FROM public.cycle_preferences WHERE owner_id = user_uuid;
  DELETE FROM public.ai_usage WHERE owner_id = user_uuid;
  DELETE FROM public.entitlements WHERE owner_id = user_uuid;
  DELETE FROM public.subscriptions WHERE owner_id = user_uuid;
  DELETE FROM public.user_consents WHERE owner_id = user_uuid;
  DELETE FROM public.recipes WHERE owner_id = user_uuid;
  DELETE FROM public.profiles WHERE id = user_uuid;
  
  RETURN TRUE;
END;
$$;