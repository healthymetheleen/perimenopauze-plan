import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface PremiumGrant {
  id: string;
  email: string;
  user_id: string | null;
  granted_by: string;
  reason: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePremiumGrants() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['premium-grants'],
    queryFn: async (): Promise<PremiumGrant[]> => {
      const { data, error } = await supabase
        .from('premium_grants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ((data || []) as unknown as PremiumGrant[]);
    },
    enabled: !!user,
  });
}

export function useUserPremiumGrant() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-premium-grant', user?.id],
    queryFn: async (): Promise<PremiumGrant | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('premium_grants')
        .select('*')
        .eq('user_id' as never, user.id as never)
        .eq('is_active' as never, true as never)
        .maybeSingle();

      if (error) throw error;
      
      const typedData = data as unknown as PremiumGrant | null;
      
      // Check if grant has expired
      if (typedData?.expires_at && new Date(typedData.expires_at) < new Date()) {
        return null;
      }
      
      return typedData;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

interface CreateGrantInput {
  email: string;
  reason?: string;
  expires_at?: string;
}

export function useCreatePremiumGrant() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGrantInput) => {
      if (!user) throw new Error('Niet ingelogd');

      const { data, error } = await supabase
        .from('premium_grants')
        .insert({
          email: input.email.toLowerCase().trim(),
          granted_by: user.id,
          reason: input.reason || null,
          expires_at: input.expires_at || null,
        } as never)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Dit e-mailadres heeft al een premium grant');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-grants'] });
      toast.success('Premium grant toegevoegd');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useTogglePremiumGrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('premium_grants')
        .update({ is_active } as never)
        .eq('id' as never, id as never);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-grants'] });
      queryClient.invalidateQueries({ queryKey: ['user-premium-grant'] });
      queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      toast.success('Premium grant bijgewerkt');
    },
    onError: () => {
      toast.error('Kon premium grant niet bijwerken');
    },
  });
}

export function useDeletePremiumGrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('premium_grants')
        .delete()
        .eq('id' as never, id as never);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-grants'] });
      queryClient.invalidateQueries({ queryKey: ['user-premium-grant'] });
      queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      toast.success('Premium grant verwijderd');
    },
    onError: () => {
      toast.error('Kon premium grant niet verwijderen');
    },
  });
}
