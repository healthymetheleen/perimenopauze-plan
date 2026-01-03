import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface UserConsent {
  accepted_privacy: boolean;
  accepted_terms: boolean;
  accepted_disclaimer: boolean;
  accepted_health_data_processing: boolean;
  accepted_at: string | null;
}

export function useConsent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['consent', user?.id],
    queryFn: async (): Promise<UserConsent | null> => {
      if (!user) return null;
      const { data, error } = await supabase.from('user_consents').select('*').eq('owner_id', user.id).maybeSingle();
      if (error) { console.error('Error fetching consent:', error); return null; }
      return data;
    },
    enabled: !!user,
  });

  const hasCompletedConsent = query.data
    ? query.data.accepted_privacy && query.data.accepted_terms && query.data.accepted_disclaimer && query.data.accepted_health_data_processing
    : false;

  const updateConsent = useMutation({
    mutationFn: async (consent: Partial<UserConsent>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('user_consents').upsert({ owner_id: user.id, ...consent, accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['consent', user?.id] }); },
  });

  return { consent: query.data, isLoading: query.isLoading, hasCompletedConsent, updateConsent };
}