-- Revoke INSERT privilege on audit_logs from authenticated users
-- This ensures only service role (edge functions) can insert audit logs
REVOKE INSERT ON public.audit_logs FROM authenticated;
REVOKE INSERT ON public.audit_logs FROM anon;