import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/lib/supabase-app';
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
      const { data: sub } = await appClient.from('subscriptions').select('plan, status').eq('owner_id', user.id).maybeSingle();
      const { data: ent } = await appClient.from('entitlements').select('*').eq('owner_id', user.id).maybeSingle();
      return {
        can_use_digest: ent?.can_use_digest ?? true,
        can_use_trends: ent?.can_use_trends ?? false,
        can_use_patterns: ent?.can_use_patterns ?? false,
        max_days_history: ent?.max_days_history ?? 7,
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
  const hasAccess = (() => {
    if (!entitlements) return false;
    switch (feature) {
      case 'trends': return entitlements.can_use_trends;
      case 'patterns': return entitlements.can_use_patterns;
      case 'export': return entitlements.can_use_trends;
      default: return false;
    }
  })();
  return { hasAccess, isLoading, entitlements };
}