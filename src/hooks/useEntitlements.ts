import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface Entitlements {
  can_use_digest: boolean;
  can_use_trends: boolean;
  can_use_patterns: boolean;
  max_days_history: number;
  plan: string;
  status: string;
}

const defaultEntitlements: Entitlements = { can_use_digest: true, can_use_trends: false, can_use_patterns: false, max_days_history: 7, plan: 'free', status: 'active' };

export function useEntitlements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['entitlements', user?.id],
    queryFn: async (): Promise<Entitlements> => {
      if (!user) return defaultEntitlements;
      const { data: sub } = await supabase.from('subscriptions').select('plan, status').eq('owner_id', user.id).maybeSingle();
      const { data: ent } = await supabase.from('entitlements').select('*').eq('owner_id', user.id).maybeSingle();
      return {
        can_use_digest: true,
        can_use_trends: ent?.can_use_trends ?? false,
        can_use_patterns: ent?.can_use_patterns ?? false,
        max_days_history: 7,
        plan: sub?.plan ?? 'free',
        status: sub?.status ?? 'active',
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeatureAccess(feature: 'trends' | 'patterns' | 'export') {
  const { data: entitlements, isLoading } = useEntitlements();
  // Trends and Patterns are now free for everyone during beta
  const hasAccess = (() => {
    if (!entitlements) return true; // Default to true for free access
    switch (feature) {
      case 'trends': return true; // Free during beta
      case 'patterns': return true; // Free during beta
      case 'export': return entitlements.can_use_trends;
      default: return false;
    }
  })();
  return { hasAccess, isLoading, entitlements };
}