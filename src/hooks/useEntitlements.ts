import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { differenceInDays } from 'date-fns';

export interface Entitlements {
  can_use_digest: boolean;
  can_use_trends: boolean;
  can_use_patterns: boolean;
  max_days_history: number;
  plan: string;
  status: string;
  trial_days_remaining: number;
  is_trial_expired: boolean;
}

const TRIAL_DAYS = 7;

const defaultEntitlements: Entitlements = { 
  can_use_digest: true, 
  can_use_trends: false, 
  can_use_patterns: false, 
  max_days_history: 7, 
  plan: 'free', 
  status: 'active',
  trial_days_remaining: TRIAL_DAYS,
  is_trial_expired: false,
};

export function useEntitlements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['entitlements', user?.id],
    queryFn: async (): Promise<Entitlements> => {
      if (!user) return defaultEntitlements;
      
      const { data: sub } = await supabase.from('subscriptions').select('plan, status, created_at').eq('owner_id', user.id).maybeSingle();
      const { data: ent } = await supabase.from('entitlements').select('*').eq('owner_id', user.id).maybeSingle();
      
      // Calculate trial status based on user creation date
      const userCreatedAt = user.created_at ? new Date(user.created_at) : new Date();
      const daysSinceCreation = differenceInDays(new Date(), userCreatedAt);
      const trialDaysRemaining = Math.max(0, TRIAL_DAYS - daysSinceCreation);
      const isTrialExpired = trialDaysRemaining === 0;
      
      // Check if user has active premium subscription
      const hasPremium = sub?.plan === 'premium' || sub?.plan === 'premium_monthly';
      const isActive = sub?.status === 'active';
      
      // Users get full access during trial OR with premium subscription
      const hasFullAccess = (trialDaysRemaining > 0) || (hasPremium && isActive);
      
      return {
        can_use_digest: true,
        can_use_trends: hasFullAccess || ent?.can_use_trends || false,
        can_use_patterns: hasFullAccess || ent?.can_use_patterns || false,
        max_days_history: hasFullAccess ? 365 : 7,
        plan: hasPremium ? 'premium' : 'free',
        status: sub?.status ?? 'active',
        trial_days_remaining: hasPremium && isActive ? 0 : trialDaysRemaining,
        is_trial_expired: !hasPremium && isTrialExpired,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeatureAccess(feature: 'trends' | 'patterns' | 'export' | 'ai') {
  const { data: entitlements, isLoading } = useEntitlements();
  const isPremium = entitlements?.plan === 'premium' && entitlements?.status === 'active';
  const isInTrial = (entitlements?.trial_days_remaining ?? 0) > 0;
  const hasFullAccess = isPremium || isInTrial;
  
  const hasAccess = (() => {
    if (!entitlements) return false;
    switch (feature) {
      case 'trends': return hasFullAccess;
      case 'patterns': return hasFullAccess;
      case 'export': return hasFullAccess;
      case 'ai': return hasFullAccess;
      default: return false;
    }
  })();
  return { hasAccess, isLoading, entitlements, isPremium, isInTrial, isTrialExpired: entitlements?.is_trial_expired };
}