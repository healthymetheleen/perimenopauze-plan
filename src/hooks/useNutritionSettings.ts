import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface NutritionSettings {
  id: string;
  // Macro targets
  target_kcal: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_fiber_g: number;
  // Extended targets
  target_protein_per_kg: number;
  target_sleep_hours: number;
  target_eating_window_hours: number;
  // Priority lists
  important_points: string[];
  less_important_points: string[];
  no_go_items: string[];
  // Ingredients
  prefer_ingredients: string[];
  avoid_ingredients: string[];
  supplement_recommendations: string[];
  // Perimenopause focus
  perimenopause_focus: string[];
  // Coaching style
  coaching_style: string;
  coaching_tone: string;
  coaching_context: string | null;
  // Philosophy
  diet_vision: string;
  app_philosophy: string;
  // Timestamps
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
        target_protein_per_kg: data.target_protein_per_kg ?? 1.6,
        target_sleep_hours: data.target_sleep_hours ?? 8.0,
        target_eating_window_hours: data.target_eating_window_hours ?? 10,
        coaching_style: data.coaching_style ?? 'empathisch',
        coaching_tone: data.coaching_tone ?? 'vriendelijk',
        coaching_context: data.coaching_context ?? null,
        app_philosophy: data.app_philosophy ?? '',
        important_points: parseJsonArray(data.important_points),
        less_important_points: parseJsonArray(data.less_important_points),
        no_go_items: parseJsonArray(data.no_go_items),
        prefer_ingredients: parseJsonArray(data.prefer_ingredients),
        avoid_ingredients: parseJsonArray(data.avoid_ingredients),
        supplement_recommendations: parseJsonArray(data.supplement_recommendations),
        perimenopause_focus: parseJsonArray(data.perimenopause_focus),
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
