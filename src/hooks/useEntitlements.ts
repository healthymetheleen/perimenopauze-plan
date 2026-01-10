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
  has_premium_grant: boolean;
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
  has_premium_grant: false,
};

export function useEntitlements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['entitlements', user?.id],
    queryFn: async (): Promise<Entitlements> => {
      if (!user) return defaultEntitlements;
      
      // Fetch subscription, entitlements, and premium grant in parallel
      const [subResult, entResult, grantResult] = await Promise.all([
        supabase.from('subscriptions').select('plan, status, created_at, trial_ends_at').eq('owner_id' as never, user.id as never).maybeSingle(),
        supabase.from('entitlements').select('*').eq('owner_id' as never, user.id as never).maybeSingle(),
        supabase.from('premium_grants').select('id, is_active, expires_at').eq('user_id' as never, user.id as never).eq('is_active' as never, true as never).maybeSingle(),
      ]);
      
      const sub = subResult.data as unknown as { plan: string; status: string; created_at: string; trial_ends_at: string | null } | null;
      const ent = entResult.data as unknown as { can_use_trends: boolean; can_use_patterns: boolean } | null;
      const grant = grantResult.data as unknown as { id: string; is_active: boolean; expires_at: string | null } | null;
      
      // Check if user has active premium grant (not expired)
      const hasPremiumGrant = grant && grant.is_active && 
        (!grant.expires_at || new Date(grant.expires_at) > new Date());
      
      // Calculate trial status - prefer trial_ends_at from subscription if available
      let trialDaysRemaining = 0;
      let isTrialExpired = false;
      
      if (sub?.trial_ends_at) {
        // Use trial_ends_at from subscription (set when user subscribes via Mollie)
        const trialEndDate = new Date(sub.trial_ends_at);
        trialDaysRemaining = Math.max(0, differenceInDays(trialEndDate, new Date()));
        isTrialExpired = trialDaysRemaining === 0;
      } else {
        // Fallback to user creation date for non-subscribed users
        const userCreatedAt = user.created_at ? new Date(user.created_at) : new Date();
        const daysSinceCreation = differenceInDays(new Date(), userCreatedAt);
        trialDaysRemaining = Math.max(0, TRIAL_DAYS - daysSinceCreation);
        isTrialExpired = trialDaysRemaining === 0;
      }
      
      // Check if user has active premium subscription
      const hasPremium = sub?.plan === 'premium' || sub?.plan === 'premium_monthly';
      const isActive = sub?.status === 'active';
      
      // Users get full access during trial OR with premium subscription OR with premium grant
      const hasFullAccess = (trialDaysRemaining > 0) || (hasPremium && isActive) || hasPremiumGrant;
      
      return {
        can_use_digest: true,
        can_use_trends: hasFullAccess || ent?.can_use_trends || false,
        can_use_patterns: hasFullAccess || ent?.can_use_patterns || false,
        max_days_history: hasFullAccess ? 365 : 7,
        plan: (hasPremium || hasPremiumGrant) ? 'premium' : 'free',
        status: sub?.status ?? 'active',
        trial_days_remaining: (hasPremium && isActive) || hasPremiumGrant ? 0 : trialDaysRemaining,
        is_trial_expired: !hasPremium && !hasPremiumGrant && isTrialExpired,
        has_premium_grant: !!hasPremiumGrant,
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
      case 'export': return true; // Always available (GDPR right)
      case 'ai': return isPremium; // AI only for premium, NOT trial
      default: return false;
    }
  })();
  return { hasAccess, isLoading, entitlements, isPremium, isInTrial, isTrialExpired: entitlements?.is_trial_expired };
}