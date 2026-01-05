import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type AgeCategory = '30-34' | '35-39' | '40-44' | '45-49' | '50-54' | '55-59' | '60+';

export interface UserProfile {
  id: string;
  display_name: string | null;
  age_category: AgeCategory | null;
  height_cm: number | null;
  weight_kg: number | null;
  accepted_body_data: boolean;
  body_data_consent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  display_name?: string | null;
  age_category?: AgeCategory | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  accepted_body_data?: boolean;
  body_data_consent_at?: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserProfile | null;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!user) throw new Error('Not authenticated');

      // Add consent timestamp if body data consent is being given
      if (updates.accepted_body_data && !updates.body_data_consent_at) {
        updates.body_data_consent_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const hasCompletedProfile = !!query.data?.age_category;

  return {
    profile: query.data,
    isLoading: query.isLoading,
    hasCompletedProfile,
    updateProfile,
  };
}

// AGE_CATEGORY_OPTIONS for use in forms
export const AGE_CATEGORY_OPTIONS = [
  { value: '30-34', label: '30-34 jaar' },
  { value: '35-39', label: '35-39 jaar' },
  { value: '40-44', label: '40-44 jaar' },
  { value: '45-49', label: '45-49 jaar' },
  { value: '50-54', label: '50-54 jaar' },
  { value: '55-59', label: '55-59 jaar' },
  { value: '60+', label: '60+ jaar' },
] as const;
