-- ============================================
-- FASE 0: Sales Layer - Subscriptions, Gates, GDPR
-- ============================================

-- 1. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS app.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'mollie',
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'inactive',
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(owner_id),
    CONSTRAINT valid_plan CHECK (plan IN ('free', 'starter', 'premium')),
    CONSTRAINT valid_status CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'inactive'))
);

CREATE INDEX idx_subscriptions_owner ON app.subscriptions(owner_id);
CREATE INDEX idx_subscriptions_provider_customer ON app.subscriptions(provider_customer_id);
CREATE INDEX idx_subscriptions_provider_sub ON app.subscriptions(provider_subscription_id);

-- 2. ENTITLEMENTS TABLE
CREATE TABLE IF NOT EXISTS app.entitlements (
    owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    can_use_digest BOOLEAN NOT NULL DEFAULT true,
    can_use_trends BOOLEAN NOT NULL DEFAULT false,
    can_use_patterns BOOLEAN NOT NULL DEFAULT false,
    max_days_history INTEGER NOT NULL DEFAULT 7,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. USER CONSENTS TABLE
CREATE TABLE IF NOT EXISTS app.user_consents (
    owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    accepted_privacy BOOLEAN NOT NULL DEFAULT false,
    accepted_terms BOOLEAN NOT NULL DEFAULT false,
    accepted_disclaimer BOOLEAN NOT NULL DEFAULT false,
    accepted_health_data_processing BOOLEAN NOT NULL DEFAULT false,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. EXPORT JOBS TABLE
CREATE TABLE IF NOT EXISTS app.export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    download_token TEXT,
    expires_at TIMESTAMPTZ,
    error TEXT,
    CONSTRAINT valid_export_status CHECK (status IN ('queued', 'processing', 'done', 'failed'))
);

CREATE INDEX idx_export_jobs_owner ON app.export_jobs(owner_id);
CREATE INDEX idx_export_jobs_token ON app.export_jobs(download_token) WHERE download_token IS NOT NULL;

-- 5. ENABLE RLS
ALTER TABLE app.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.export_jobs ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- Subscriptions: SELECT only for owner (no client writes)
CREATE POLICY "Users can view own subscription" 
ON app.subscriptions FOR SELECT 
USING (owner_id = auth.uid());

-- Entitlements: SELECT only for owner (no client writes)
CREATE POLICY "Users can view own entitlements" 
ON app.entitlements FOR SELECT 
USING (owner_id = auth.uid());

-- User Consents: Full owner access
CREATE POLICY "Users can view own consents" 
ON app.user_consents FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own consents" 
ON app.user_consents FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own consents" 
ON app.user_consents FOR UPDATE 
USING (owner_id = auth.uid());

-- Export Jobs: SELECT and INSERT for owner, no UPDATE/DELETE
CREATE POLICY "Users can view own export jobs" 
ON app.export_jobs FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Users can request export" 
ON app.export_jobs FOR INSERT 
WITH CHECK (owner_id = auth.uid());

-- 7. COLUMN-LEVEL GRANTS

-- Revoke write access on subscriptions from authenticated
REVOKE INSERT, UPDATE, DELETE ON app.subscriptions FROM authenticated;
GRANT SELECT ON app.subscriptions TO authenticated;

-- Revoke write access on entitlements from authenticated
REVOKE INSERT, UPDATE, DELETE ON app.entitlements FROM authenticated;
GRANT SELECT ON app.entitlements TO authenticated;

-- Export jobs: only allow insert with specific columns, no update
REVOKE UPDATE, DELETE ON app.export_jobs FROM authenticated;
GRANT SELECT, INSERT ON app.export_jobs TO authenticated;

-- 8. TRIGGER: Sync entitlements when subscription changes
CREATE OR REPLACE FUNCTION app.sync_entitlements_from_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
DECLARE
    v_can_trends BOOLEAN;
    v_can_patterns BOOLEAN;
    v_max_history INTEGER;
BEGIN
    -- Determine entitlements based on plan and status
    IF NEW.status IN ('trialing', 'active') THEN
        CASE NEW.plan
            WHEN 'premium' THEN
                v_can_trends := true;
                v_can_patterns := true;
                v_max_history := 90;
            WHEN 'starter' THEN
                v_can_trends := true;
                v_can_patterns := false;
                v_max_history := 30;
            ELSE -- free
                v_can_trends := false;
                v_can_patterns := false;
                v_max_history := 7;
        END CASE;
    ELSE
        -- Inactive, canceled, past_due: fallback to free
        v_can_trends := false;
        v_can_patterns := false;
        v_max_history := 7;
    END IF;

    -- Upsert entitlements
    INSERT INTO app.entitlements (owner_id, can_use_digest, can_use_trends, can_use_patterns, max_days_history, updated_at)
    VALUES (NEW.owner_id, true, v_can_trends, v_can_patterns, v_max_history, now())
    ON CONFLICT (owner_id) DO UPDATE SET
        can_use_trends = v_can_trends,
        can_use_patterns = v_can_patterns,
        max_days_history = v_max_history,
        updated_at = now();

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_entitlements
AFTER INSERT OR UPDATE ON app.subscriptions
FOR EACH ROW
EXECUTE FUNCTION app.sync_entitlements_from_subscription();

-- 9. TRIGGER: Create default subscription and entitlements on new user
CREATE OR REPLACE FUNCTION app.handle_new_user_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
BEGIN
    -- Create default free subscription
    INSERT INTO app.subscriptions (owner_id, plan, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (owner_id) DO NOTHING;

    -- Create default entitlements (will also be triggered by subscription insert)
    INSERT INTO app.entitlements (owner_id, can_use_digest, can_use_trends, can_use_patterns, max_days_history)
    VALUES (NEW.id, true, false, false, 7)
    ON CONFLICT (owner_id) DO NOTHING;

    -- Create empty consents record
    INSERT INTO app.user_consents (owner_id)
    VALUES (NEW.id)
    ON CONFLICT (owner_id) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_sales
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION app.handle_new_user_sales();

-- 10. VIEW: Subscription with entitlements
CREATE OR REPLACE VIEW app.v_user_subscription AS
SELECT 
    s.owner_id,
    s.plan,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end,
    e.can_use_digest,
    e.can_use_trends,
    e.can_use_patterns,
    e.max_days_history
FROM app.subscriptions s
LEFT JOIN app.entitlements e ON s.owner_id = e.owner_id
WHERE s.owner_id = auth.uid();

-- 11. FUNCTION: Check feature access (for server-side use)
CREATE OR REPLACE FUNCTION app.check_feature_access(p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
DECLARE
    v_result BOOLEAN;
BEGIN
    SELECT 
        CASE p_feature
            WHEN 'digest' THEN COALESCE(can_use_digest, false)
            WHEN 'trends' THEN COALESCE(can_use_trends, false)
            WHEN 'patterns' THEN COALESCE(can_use_patterns, false)
            ELSE false
        END INTO v_result
    FROM app.entitlements
    WHERE owner_id = auth.uid();

    RETURN COALESCE(v_result, false);
END;
$$;

-- 12. FUNCTION: Check if user has completed consent
CREATE OR REPLACE FUNCTION app.has_completed_consent()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $$
DECLARE
    v_result BOOLEAN;
BEGIN
    SELECT (
        accepted_privacy AND 
        accepted_terms AND 
        accepted_disclaimer AND 
        accepted_health_data_processing
    ) INTO v_result
    FROM app.user_consents
    WHERE owner_id = auth.uid();

    RETURN COALESCE(v_result, false);
END;
$$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION app.check_feature_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION app.has_completed_consent() TO authenticated;