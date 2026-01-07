import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useConsent } from '@/hooks/useConsent';
import { useTranslation } from 'react-i18next';

export interface WeeklyNutritionInsight {
  samenvatting: string;
  sterke_punten: string[];
  aandachtspunten: string[];
  ortho_tip: {
    titel: string;
    uitleg: string;
    voedingsmiddelen: string[];
  } | null;
  weekdoel: string;
  week_start: string;
  days_logged: number;
  avg_protein: number;
  avg_fiber: number;
  avg_kcal: number;
}

interface InsightResponse {
  insight?: WeeklyNutritionInsight;
  error?: string;
  message?: string;
  cached?: boolean;
}

export function useWeeklyNutritionInsight() {
  const { user } = useAuth();
  const { consent } = useConsent();
  const { i18n } = useTranslation();
  const hasAIConsent = consent?.accepted_ai_processing === true;
  const language = i18n.language?.startsWith('en') ? 'en' : 'nl';

  return useQuery({
    queryKey: ['weekly-nutrition-insight', user?.id, language],
    queryFn: async (): Promise<InsightResponse> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('weekly-nutrition-insight', {
        body: { language }
      });

      if (error) {
        console.error('Weekly insight error:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user && hasAIConsent,
    staleTime: 1000 * 60 * 60, // 1 hour - cache client-side as well
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    retry: 1,
  });
}
