-- =====================================================
-- RLS SECURITY TEST QUERIES
-- Run these as different authenticated users to verify RLS
-- =====================================================

-- =====================================================
-- SETUP: Run these first to get test context
-- =====================================================

-- Get current user ID
SELECT auth.uid() as my_user_id;

-- Get another user's ID (for testing - should NOT be accessible)
-- Note: This query should return 0 rows due to RLS
SELECT id as other_user_id FROM profiles WHERE id != auth.uid() LIMIT 1;


-- =====================================================
-- TEST 1: SELECT RESTRICTIONS
-- All these should return 0 rows for other users' data
-- =====================================================

-- 1a. Meals - cannot see other users' meals
SELECT COUNT(*) as should_be_zero 
FROM meals 
WHERE owner_id != auth.uid();

-- 1b. Symptoms - cannot see other users' symptoms
SELECT COUNT(*) as should_be_zero 
FROM symptoms 
WHERE owner_id != auth.uid();

-- 1c. Sleep sessions - cannot see other users' sleep data
SELECT COUNT(*) as should_be_zero 
FROM sleep_sessions 
WHERE owner_id != auth.uid();

-- 1d. Bleeding logs - cannot see other users' cycle data
SELECT COUNT(*) as should_be_zero 
FROM bleeding_logs 
WHERE owner_id != auth.uid();

-- 1e. Cycle symptom logs
SELECT COUNT(*) as should_be_zero 
FROM cycle_symptom_logs 
WHERE owner_id != auth.uid();

-- 1f. Fertility signals
SELECT COUNT(*) as should_be_zero 
FROM fertility_signals 
WHERE owner_id != auth.uid();

-- 1g. Daily context
SELECT COUNT(*) as should_be_zero 
FROM daily_context 
WHERE owner_id != auth.uid();

-- 1h. AI usage logs
SELECT COUNT(*) as should_be_zero 
FROM ai_usage 
WHERE owner_id != auth.uid();

-- 1i. AI insights cache
SELECT COUNT(*) as should_be_zero 
FROM ai_insights_cache 
WHERE owner_id != auth.uid();


-- =====================================================
-- TEST 2: INSERT RESTRICTIONS
-- All these should fail with RLS policy violation
-- =====================================================

-- 2a. Cannot insert meal for other user
-- Replace with actual user ID that is NOT current user
INSERT INTO meals (owner_id, day_id, source) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,  -- fake/other user
  '00000000-0000-0000-0000-000000000002'::uuid,  -- fake day
  'test'
);
-- Expected: ERROR - violates row-level security policy

-- 2b. Cannot insert symptom for other user
INSERT INTO symptoms (owner_id, day_id, symptom_code, severity_0_10) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'fatigue',
  5
);
-- Expected: ERROR - violates row-level security policy


-- =====================================================
-- TEST 3: UPDATE RESTRICTIONS
-- All these should affect 0 rows or fail
-- =====================================================

-- 3a. Cannot update other users' meals
UPDATE meals 
SET kcal = 9999 
WHERE owner_id != auth.uid();
-- Expected: 0 rows affected

-- 3b. Cannot update other users' profiles
UPDATE profiles 
SET display_name = 'Hacked!' 
WHERE id != auth.uid();
-- Expected: 0 rows affected


-- =====================================================
-- TEST 4: DELETE RESTRICTIONS
-- All these should affect 0 rows
-- =====================================================

-- 4a. Cannot delete other users' meals
DELETE FROM meals 
WHERE owner_id != auth.uid();
-- Expected: 0 rows affected

-- 4b. Cannot delete other users' symptoms
DELETE FROM symptoms 
WHERE owner_id != auth.uid();
-- Expected: 0 rows affected


-- =====================================================
-- TEST 5: ADMIN ROLE ESCALATION PREVENTION
-- These should fail for non-admin users
-- =====================================================

-- 5a. Cannot grant self admin role
INSERT INTO user_roles (user_id, role) 
VALUES (auth.uid(), 'admin');
-- Expected: ERROR - violates row-level security policy (unless already admin)

-- 5b. Cannot read audit logs (non-admin)
SELECT COUNT(*) FROM audit_logs;
-- Expected: 0 rows (unless admin)

-- 5c. Cannot see other users' roles
SELECT * FROM user_roles WHERE user_id != auth.uid();
-- Expected: 0 rows (unless admin)


-- =====================================================
-- TEST 6: STORAGE BUCKET RESTRICTIONS
-- =====================================================

-- Note: Storage policies are tested via the Supabase client library
-- These queries show what the policies enforce:

-- 6a. User uploads bucket - can only access own folder
-- Policy: auth.uid()::text = (storage.foldername(name))[1]
-- Means: file must be in /{user_id}/ folder

-- 6b. Content images bucket - admins manage, users read
-- Policy: has_role(auth.uid(), 'admin') for write
-- Policy: auth.uid() IS NOT NULL for read


-- =====================================================
-- TEST 7: VIEW SECURITY (SECURITY INVOKER)
-- =====================================================

-- 7a. v_daily_scores only shows own data
SELECT COUNT(*) as should_only_be_my_data 
FROM v_daily_scores 
WHERE owner_id != auth.uid();
-- Expected: 0 rows

-- 7b. Community posts are public
SELECT COUNT(*) as community_posts_visible 
FROM v_community_posts;
-- Expected: All posts visible (public by design)

-- 7c. Anonymous posts hide owner_id
SELECT id, owner_id, is_anonymous 
FROM v_community_posts 
WHERE is_anonymous = true;
-- Expected: owner_id should be NULL for anonymous posts


-- =====================================================
-- TEST 8: FUNCTION SECURITY
-- =====================================================

-- 8a. Cannot export other user's data
SELECT export_user_data_complete('00000000-0000-0000-0000-000000000001'::uuid);
-- Expected: ERROR - Unauthorized: can only export own data

-- 8b. Cannot delete other user's data
SELECT delete_user_data('00000000-0000-0000-0000-000000000001'::uuid);
-- Expected: ERROR - Unauthorized: can only delete own data

-- 8c. Can export own data
SELECT export_user_data_complete(auth.uid());
-- Expected: JSON with all user's data


-- =====================================================
-- VERIFICATION SUMMARY
-- =====================================================

-- Run this to get a summary of RLS status on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: All tables should have rls_enabled = true


-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
-- Expected: Each table should have at least SELECT, INSERT, UPDATE, DELETE policies
