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
      return (data || []) as PremiumGrant[];
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
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      // Check if grant has expired
      if (data?.expires_at && new Date(data.expires_at) < new Date()) {
        return null;
      }
      
      return data as PremiumGrant | null;
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
        })
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
        .update({ is_active })
        .eq('id', id);

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
        .eq('id', id);

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
