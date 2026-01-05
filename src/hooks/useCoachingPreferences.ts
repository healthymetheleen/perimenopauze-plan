import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface CoachingPreferences {
  id: string;
  owner_id: string;
  focus_nutrition: boolean;
  focus_sleep: boolean;
  focus_cycle: boolean;
  focus_movement: boolean;
  focus_stress: boolean;
  focus_symptoms: string[];
  personal_context: string | null;
  created_at: string;
  updated_at: string;
}

export function useCoachingPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['coaching-preferences', user?.id],
    queryFn: async (): Promise<CoachingPreferences | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('coaching_preferences')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching coaching preferences:', error);
        return null;
      }

      return data as CoachingPreferences | null;
    },
    enabled: !!user,
  });
}

export function useUpdateCoachingPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<CoachingPreferences, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>) => {
      if (!user) throw new Error('Not authenticated');

      // Try upsert
      const { data, error } = await supabase
        .from('coaching_preferences')
        .upsert({
          owner_id: user.id,
          ...updates,
        }, {
          onConflict: 'owner_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching-preferences'] });
    },
  });
}
