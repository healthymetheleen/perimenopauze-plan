import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface NutritionSettings {
  id: string;
  target_kcal: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_fiber_g: number;
  important_points: string[];
  less_important_points: string[];
  no_go_items: string[];
  diet_vision: string;
  created_at: string;
  updated_at: string;
}

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export function useNutritionSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nutrition-settings'],
    queryFn: async (): Promise<NutritionSettings | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('nutrition_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .single();

      if (error) throw error;
      
      // Parse JSONB fields safely
      const parseJsonArray = (val: unknown): string[] => {
        if (Array.isArray(val)) {
          return val.filter((item): item is string => typeof item === 'string');
        }
        return [];
      };

      return {
        ...data,
        important_points: parseJsonArray(data.important_points),
        less_important_points: parseJsonArray(data.less_important_points),
        no_go_items: parseJsonArray(data.no_go_items),
      };
    },
    enabled: !!user,
  });
}

export function useUpdateNutritionSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<NutritionSettings>) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('nutrition_settings')
        .update(settings)
        .eq('id', SETTINGS_ID);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-settings'] });
    },
  });
}
