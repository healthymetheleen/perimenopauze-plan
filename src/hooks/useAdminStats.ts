import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useIsAdmin } from './useIsAdmin';

export interface AdminStats {
  total_members: number;
  paid_members: number;
  trial_members: number;
  ai_calls_today: number;
  ai_calls_this_month: number;
  unique_ai_users_month: number;
  avg_ai_calls_per_user_month: number;
  meals_logged_month: number;
  sleep_sessions_month: number;
  cycle_logs_month: number;
  community_posts_month: number;
  symptoms_logged_month: number;
  estimated_ai_cost_month_eur: number;
  estimated_ai_cost_per_user_month_eur: number;
  page_views: { page: string; views: number }[] | null;
  generated_at: string;
}

export interface AIUsageBreakdown {
  function_name: string;
  calls_today: number;
  calls_this_month: number;
  unique_users: number;
  estimated_cost_eur: number;
}

export function useAdminStats() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['admin-stats', user?.id],
    queryFn: async (): Promise<AdminStats | null> => {
      if (!user || !isAdmin) return null;

      const { data, error } = await supabase.rpc('get_admin_stats');
      
      if (error) {
        console.error('Error fetching admin stats:', error);
        throw error;
      }
      
      return data as unknown as AdminStats;
    },
    enabled: !!user && !!isAdmin,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

export function useAIUsageBreakdown() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['ai-usage-breakdown', user?.id],
    queryFn: async (): Promise<AIUsageBreakdown[] | null> => {
      if (!user || !isAdmin) return null;

      const { data, error } = await supabase.rpc('get_ai_usage_breakdown');
      
      if (error) {
        console.error('Error fetching AI usage breakdown:', error);
        throw error;
      }
      
      return data as unknown as AIUsageBreakdown[];
    },
    enabled: !!user && !!isAdmin,
    staleTime: 60 * 1000,
  });
}
