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
        .eq('id' as never, SETTINGS_ID as never)
        .single();

      if (error) throw error;
      
      const typedData = data as unknown as Record<string, unknown>;
      
      // Parse JSONB fields safely
      const parseJsonArray = (val: unknown): string[] => {
        if (Array.isArray(val)) {
          return val.filter((item): item is string => typeof item === 'string');
        }
        return [];
      };

      return {
        id: typedData.id as string,
        target_kcal: typedData.target_kcal as number,
        target_protein_g: typedData.target_protein_g as number,
        target_carbs_g: typedData.target_carbs_g as number,
        target_fat_g: typedData.target_fat_g as number,
        target_fiber_g: typedData.target_fiber_g as number,
        target_protein_per_kg: (typedData.target_protein_per_kg as number) ?? 1.6,
        target_sleep_hours: (typedData.target_sleep_hours as number) ?? 8.0,
        target_eating_window_hours: (typedData.target_eating_window_hours as number) ?? 10,
        coaching_style: (typedData.coaching_style as string) ?? 'empathisch',
        coaching_tone: (typedData.coaching_tone as string) ?? 'vriendelijk',
        coaching_context: (typedData.coaching_context as string | null) ?? null,
        diet_vision: (typedData.diet_vision as string) ?? '',
        app_philosophy: (typedData.app_philosophy as string) ?? '',
        important_points: parseJsonArray(typedData.important_points),
        less_important_points: parseJsonArray(typedData.less_important_points),
        no_go_items: parseJsonArray(typedData.no_go_items),
        prefer_ingredients: parseJsonArray(typedData.prefer_ingredients),
        avoid_ingredients: parseJsonArray(typedData.avoid_ingredients),
        supplement_recommendations: parseJsonArray(typedData.supplement_recommendations),
        perimenopause_focus: parseJsonArray(typedData.perimenopause_focus),
        created_at: typedData.created_at as string,
        updated_at: typedData.updated_at as string,
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
        .update(settings as never)
        .eq('id' as never, SETTINGS_ID as never);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-settings'] });
    },
  });
}
