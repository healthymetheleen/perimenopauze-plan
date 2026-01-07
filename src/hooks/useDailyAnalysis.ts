import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

export interface DailyAnalysis {
  hasYesterdayData: boolean;
  yesterdaySummary: string | null;
  highlights: string[];
  improvements: string[];
  lifestyleTips?: {
    foods: string[];
    habits: string[];
  };
  seasonTip: string;
  orthomolecular?: {
    minerals: string[];
    foods: string[];
    avoid: string[];
  };
}

export function useDailyAnalysis() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith('en') ? 'en' : 'nl';

  return useQuery({
    queryKey: ['daily-analysis', user?.id, language],
    queryFn: async (): Promise<DailyAnalysis | null> => {
      if (!user) return null;

      const { data, error } = await supabase.functions.invoke('daily-analysis', {
        body: { language }
      });

      if (error) {
        console.error('Daily analysis error:', error);
        return null;
      }

      return data as DailyAnalysis;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (analysis is daily)
    refetchOnWindowFocus: false,
  });
}
