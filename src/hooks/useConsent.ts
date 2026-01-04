import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Current consent version - update when consent text changes
export const CONSENT_VERSION = '1.0';
export const PRIVACY_POLICY_VERSION = '1.0';
export const TERMS_VERSION = '1.0';

export interface UserConsent {
  accepted_privacy: boolean;
  accepted_terms: boolean;
  accepted_disclaimer: boolean;
  accepted_health_data_processing: boolean;
  accepted_ai_processing?: boolean;
  accepted_at: string | null;
  consent_version?: string;
  privacy_policy_version?: string;
  terms_version?: string;
}

export function useConsent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['consent', user?.id],
    queryFn: async (): Promise<UserConsent | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (error) {
        console.error('Error fetching consent:', error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  const hasCompletedConsent = query.data
    ? query.data.accepted_privacy &&
      query.data.accepted_terms &&
      query.data.accepted_disclaimer &&
      query.data.accepted_health_data_processing
    : false;

  const updateConsent = useMutation({
    mutationFn: async (consent: Partial<UserConsent>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('user_consents').upsert({
        owner_id: user.id,
        ...consent,
        consent_version: CONSENT_VERSION,
        privacy_policy_version: PRIVACY_POLICY_VERSION,
        terms_version: TERMS_VERSION,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent', user?.id] });
    },
  });

  return {
    consent: query.data,
    isLoading: query.isLoading,
    hasCompletedConsent,
    updateConsent,
  };
}

// Hook for exporting user data (GDPR)
export function useExportData() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('export_user_data', {
        user_uuid: user.id,
      });
      
      if (error) throw error;
      return data;
    },
  });
}

// Hook for deleting user data (GDPR right to be forgotten)
export function useDeleteAccount() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      // First delete all user data
      const { error: deleteError } = await supabase.rpc('delete_user_data', {
        user_uuid: user.id,
      });
      
      if (deleteError) throw deleteError;
      
      // Then sign out
      await supabase.auth.signOut();
      
      return true;
    },
  });
}
