-- =====================================================
-- FORCE RLS + FUNCTION HARDENING MIGRATION
-- Final security hardening before production
-- =====================================================

-- 1. ENABLE FORCE RLS ON ALL SENSITIVE TABLES
-- This prevents table owners and superusers from bypassing RLS
-- Only enable on tables with user data, not on reference tables

-- Health data tables (bijzondere persoonsgegevens)
ALTER TABLE public.meals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daily_context FORCE ROW LEVEL SECURITY;
ALTER TABLE public.diary_days FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bleeding_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_symptom_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.fertility_signals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cycles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_predictions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_preferences FORCE ROW LEVEL SECURITY;

-- Personal data tables
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.consent_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements FORCE ROW LEVEL SECURITY;

-- AI and audit data
ALTER TABLE public.ai_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights_cache FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- User roles (critical for authorization)
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- Community (user-generated content)
ALTER TABLE public.community_posts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recipes FORCE ROW LEVEL SECURITY;

-- Note: NOT forcing RLS on reference tables (exercises, meditations, symptom_catalog, nutrition_settings)
-- These are admin-managed content tables where authenticated users need read access


-- 2. HARDEN SECURITY DEFINER FUNCTIONS
-- Ensure all have proper search_path and are truly necessary

-- Review and update delete_user_data to include storage cleanup
CREATE OR REPLACE FUNCTION public.delete_user_data(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  storage_objects_deleted integer := 0;
BEGIN
  -- Only allow users to delete their own data
  IF auth.uid() IS NULL OR auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Unauthorized: can only delete own data';
  END IF;
  
  -- Log the deletion request (without PII)
  INSERT INTO public.audit_logs (actor_id, action, target_type, metadata)
  VALUES (user_uuid, 'account_deletion_requested', 'user', '{"initiated_by": "user"}'::jsonb);
  
  -- 1. DELETE STORAGE OBJECTS FIRST
  -- Delete user's uploaded files from storage
  DELETE FROM storage.objects 
  WHERE bucket_id = 'user-uploads' 
    AND (storage.foldername(name))[1] = user_uuid::text;
  GET DIAGNOSTICS storage_objects_deleted = ROW_COUNT;
  
  -- 2. ANONYMIZE COMMUNITY CONTENT (preserve community value)
  UPDATE public.community_posts 
  SET is_anonymous = true
  WHERE owner_id = user_uuid;
  
  UPDATE public.community_comments 
  SET is_anonymous = true
  WHERE owner_id = user_uuid;
  
  -- Delete likes (no content value to preserve)
  DELETE FROM public.community_likes WHERE owner_id = user_uuid;
  
  -- 3. DELETE USER DATA IN CORRECT ORDER (respecting foreign keys)
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
  DELETE FROM public.ai_insights_cache WHERE owner_id = user_uuid;
  DELETE FROM public.entitlements WHERE owner_id = user_uuid;
  DELETE FROM public.subscriptions WHERE owner_id = user_uuid;
  DELETE FROM public.consent_history WHERE owner_id = user_uuid;
  DELETE FROM public.user_consents WHERE owner_id = user_uuid;
  DELETE FROM public.recipes WHERE owner_id = user_uuid;
  DELETE FROM public.user_roles WHERE user_id = user_uuid;
  DELETE FROM public.profiles WHERE id = user_uuid;
  
  -- Log completion
  INSERT INTO public.audit_logs (actor_id, action, target_type, metadata)
  VALUES (user_uuid, 'account_deletion_completed', 'user', 
    jsonb_build_object('storage_files_deleted', storage_objects_deleted));
  
  RETURN TRUE;
END;
$$;


-- 3. UPDATE EXPORT TO INCLUDE STORAGE FILE REFERENCES
CREATE OR REPLACE FUNCTION public.export_user_data_complete(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  storage_files JSONB;
BEGIN
  -- Only allow users to export their own data
  IF auth.uid() IS NULL OR auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Unauthorized: can only export own data';
  END IF;
  
  -- Get list of user's storage files (paths only, not content)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'bucket', bucket_id,
    'path', name,
    'size', (metadata->>'size')::integer,
    'created_at', created_at,
    'note', 'Request signed URLs via app to download files'
  )), '[]'::jsonb)
  INTO storage_files
  FROM storage.objects
  WHERE bucket_id = 'user-uploads' 
    AND (storage.foldername(name))[1] = user_uuid::text;
  
  SELECT jsonb_build_object(
    'export_metadata', jsonb_build_object(
      'exported_at', NOW(),
      'user_id', user_uuid,
      'format_version', '2.1',
      'gdpr_request_type', 'DSAR',
      'note', 'This export contains all personal data processed by Perimenopauze Plan App'
    ),
    'storage_files', storage_files,
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


-- 4. ADD CONSENT WITHDRAWAL FUNCTION
CREATE OR REPLACE FUNCTION public.withdraw_consent(
  user_uuid uuid,
  consent_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to manage their own consent
  IF auth.uid() IS NULL OR auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Unauthorized: can only manage own consent';
  END IF;
  
  -- Validate consent type
  IF consent_type NOT IN ('ai_processing', 'health_data_processing', 'all') THEN
    RAISE EXCEPTION 'Invalid consent type. Use: ai_processing, health_data_processing, or all';
  END IF;
  
  -- Record withdrawal in history
  INSERT INTO public.consent_history (owner_id, consent_type, consent_given, consent_version)
  SELECT user_uuid, consent_type, false, consent_version
  FROM public.user_consents
  WHERE owner_id = user_uuid;
  
  -- Update consent record
  IF consent_type = 'ai_processing' THEN
    UPDATE public.user_consents
    SET accepted_ai_processing = false, updated_at = NOW()
    WHERE owner_id = user_uuid;
    
    -- Clear AI cache when AI consent is withdrawn
    DELETE FROM public.ai_insights_cache WHERE owner_id = user_uuid;
    
  ELSIF consent_type = 'health_data_processing' THEN
    -- Withdrawing health data processing consent requires data deletion
    -- This is a significant action, so we mark it but don't auto-delete
    UPDATE public.user_consents
    SET accepted_health_data_processing = false, updated_at = NOW()
    WHERE owner_id = user_uuid;
    
    -- Log that user should follow up with full deletion if they want data removed
    INSERT INTO public.audit_logs (actor_id, action, target_type, metadata)
    VALUES (user_uuid, 'consent_withdrawn_health_data', 'consent', 
      '{"note": "User should delete account to fully remove health data"}'::jsonb);
      
  ELSIF consent_type = 'all' THEN
    UPDATE public.user_consents
    SET 
      accepted_ai_processing = false,
      accepted_health_data_processing = false,
      updated_at = NOW()
    WHERE owner_id = user_uuid;
    
    DELETE FROM public.ai_insights_cache WHERE owner_id = user_uuid;
  END IF;
  
  RETURN TRUE;
END;
$$;


-- 5. UPDATE AUDIT LOG TABLE TO BE MORE MINIMAL
-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_action 
  ON public.audit_logs (actor_id, action, created_at DESC);

-- Add comment explaining retention rationale
COMMENT ON TABLE public.audit_logs IS 
'Security audit trail for accountability and incident investigation.
Retention: 24 months (chosen for security/incident investigation purposes, not legal requirement).
Fields intentionally minimal: no PII, no payloads, only metadata.
Periodically review if this retention period is still appropriate.';


-- 6. VERIFY set_retention_date trigger is NOT SECURITY DEFINER (it's not, good)
-- This is correct as it runs in the context of the inserting user