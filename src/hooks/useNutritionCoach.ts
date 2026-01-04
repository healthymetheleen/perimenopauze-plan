import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface NutritionCoachResponse {
  tips: string[];
  currentSeason: string;
  stats?: {
    avgProtein: number;
    avgFiber: number;
    avgKcal: number;
    daysLogged: number;
  };
}

export function useNutritionCoach() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nutrition-coach', user?.id],
    queryFn: async (): Promise<NutritionCoachResponse> => {
      const { data, error } = await supabase.functions.invoke('nutrition-coach');
      
      if (error) {
        console.error('Nutrition coach error:', error);
        return { tips: [], currentSeason: 'onbekend' };
      }
      
      return data || { tips: [], currentSeason: 'onbekend' };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    refetchOnWindowFocus: false,
  });
}