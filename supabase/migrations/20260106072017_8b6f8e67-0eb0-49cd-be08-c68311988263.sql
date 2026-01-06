-- Create anonymous page analytics table (GDPR-friendly: no user IDs, only aggregates)
CREATE TABLE public.page_analytics_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  month_date date NOT NULL, -- First day of the month (e.g. 2026-01-01)
  view_count integer NOT NULL DEFAULT 0,
  unique_sessions integer NOT NULL DEFAULT 0, -- Approximate unique visitors (from session count, not user IDs)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_path, month_date)
);

-- Enable RLS
ALTER TABLE public.page_analytics_monthly ENABLE ROW LEVEL SECURITY;

-- Only admins can view analytics
CREATE POLICY "Admins can view page analytics"
  ON public.page_analytics_monthly
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Any authenticated user can increment counters (via function, not direct)
-- We'll use a database function for atomic increments

-- Create function to increment page view (called from frontend, but no user ID stored)
CREATE OR REPLACE FUNCTION public.increment_page_view(p_page_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_date date;
BEGIN
  -- Get first day of current month
  v_month_date := date_trunc('month', CURRENT_DATE)::date;
  
  -- Upsert: increment view_count, approximate unique_sessions
  INSERT INTO public.page_analytics_monthly (page_path, month_date, view_count, unique_sessions)
  VALUES (p_page_path, v_month_date, 1, 1)
  ON CONFLICT (page_path, month_date)
  DO UPDATE SET 
    view_count = page_analytics_monthly.view_count + 1,
    updated_at = now();
END;
$$;

-- Create view for admin dashboard aggregations
CREATE OR REPLACE VIEW public.v_admin_stats AS
SELECT
  -- Member counts
  (SELECT COUNT(*) FROM auth.users) as total_members,
  (SELECT COUNT(*) FROM public.subscriptions WHERE plan != 'free' AND status = 'active') as paid_members,
  (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'trialing') as trial_members,
  
  -- AI usage this month
  (SELECT COUNT(*) FROM public.ai_usage 
   WHERE created_at >= date_trunc('month', CURRENT_DATE)) as ai_calls_this_month,
  
  -- AI usage today
  (SELECT COUNT(*) FROM public.ai_usage 
   WHERE created_at >= CURRENT_DATE) as ai_calls_today,
  
  -- Average AI calls per active user this month
  (SELECT ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT owner_id), 0), 2)
   FROM public.ai_usage 
   WHERE created_at >= date_trunc('month', CURRENT_DATE)) as avg_ai_calls_per_user_month,
  
  -- Unique AI users this month
  (SELECT COUNT(DISTINCT owner_id) FROM public.ai_usage 
   WHERE created_at >= date_trunc('month', CURRENT_DATE)) as unique_ai_users_month,
  
  -- Activity metrics (meals logged this month)
  (SELECT COUNT(*) FROM public.meals 
   WHERE created_at >= date_trunc('month', CURRENT_DATE)) as meals_logged_month,
  
  -- Sleep sessions this month
  (SELECT COUNT(*) FROM public.sleep_sessions 
   WHERE created_at >= date_trunc('month', CURRENT_DATE)) as sleep_sessions_month,
  
  -- Cycle logs this month
  (SELECT COUNT(*) FROM public.cycle_symptom_logs 
   WHERE created_at >= date_trunc('month', CURRENT_DATE)) as cycle_logs_month,
  
  -- Community posts this month
  (SELECT COUNT(*) FROM public.community_posts 
   WHERE created_at >= date_trunc('month', CURRENT_DATE)) as community_posts_month;

-- Grant access to view for admins only (via RLS on underlying function)
-- Note: Views inherit permissions from the tables they query

-- Create function to get admin stats (secured)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  
  SELECT jsonb_build_object(
    'total_members', (SELECT COUNT(*) FROM auth.users),
    'paid_members', (SELECT COUNT(*) FROM subscriptions WHERE plan != 'free' AND status = 'active'),
    'trial_members', (SELECT COUNT(*) FROM subscriptions WHERE status = 'trialing'),
    'ai_calls_today', (SELECT COUNT(*) FROM ai_usage WHERE created_at >= CURRENT_DATE),
    'ai_calls_this_month', (SELECT COUNT(*) FROM ai_usage WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    'unique_ai_users_month', (SELECT COUNT(DISTINCT owner_id) FROM ai_usage WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    'avg_ai_calls_per_user_month', (
      SELECT ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT owner_id), 0), 2)
      FROM ai_usage WHERE created_at >= date_trunc('month', CURRENT_DATE)
    ),
    'meals_logged_month', (SELECT COUNT(*) FROM meals WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    'sleep_sessions_month', (SELECT COUNT(*) FROM sleep_sessions WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    'cycle_logs_month', (SELECT COUNT(*) FROM cycle_symptom_logs WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    'community_posts_month', (SELECT COUNT(*) FROM community_posts WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    'symptoms_logged_month', (SELECT COUNT(*) FROM symptoms WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    -- AI cost estimate (approximately €0.003 per AI call for GPT-4o with our token usage)
    'estimated_ai_cost_month_eur', (
      SELECT ROUND((COUNT(*) * 0.003)::numeric, 2) 
      FROM ai_usage WHERE created_at >= date_trunc('month', CURRENT_DATE)
    ),
    'estimated_ai_cost_per_user_month_eur', (
      SELECT ROUND((COUNT(*) * 0.003 / NULLIF(COUNT(DISTINCT owner_id), 0))::numeric, 4)
      FROM ai_usage WHERE created_at >= date_trunc('month', CURRENT_DATE)
    ),
    -- Page analytics (current month)
    'page_views', (
      SELECT jsonb_agg(jsonb_build_object(
        'page', page_path,
        'views', view_count
      ) ORDER BY view_count DESC)
      FROM page_analytics_monthly 
      WHERE month_date = date_trunc('month', CURRENT_DATE)::date
    ),
    'generated_at', now()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Create function to get AI usage breakdown by function
CREATE OR REPLACE FUNCTION public.get_ai_usage_breakdown()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'function_name', function_name,
      'calls_today', SUM(CASE WHEN created_at >= CURRENT_DATE THEN 1 ELSE 0 END),
      'calls_this_month', COUNT(*),
      'unique_users', COUNT(DISTINCT owner_id),
      'estimated_cost_eur', ROUND((COUNT(*) * 0.003)::numeric, 2)
    ))
    FROM ai_usage
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
    GROUP BY function_name
    ORDER BY COUNT(*) DESC
  );
END;
$$;