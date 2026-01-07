import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

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
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith('en') ? 'en' : 'nl';

  return useQuery({
    queryKey: ['nutrition-coach', user?.id, language],
    queryFn: async (): Promise<NutritionCoachResponse> => {
      const { data, error } = await supabase.functions.invoke('nutrition-coach', {
        body: { language }
      });
      
      if (error) {
        console.error('Nutrition coach error:', error);
        return { tips: [], currentSeason: language === 'en' ? 'unknown' : 'onbekend' };
      }
      
      return data || { tips: [], currentSeason: language === 'en' ? 'unknown' : 'onbekend' };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    refetchOnWindowFocus: false,
  });
}