import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface DailyAnalysis {
  hasYesterdayData: boolean;
  yesterdaySummary: string | null;
  highlights: string[];
  improvements: string[];
  orthomolecular: {
    minerals: string[];
    foods: string[];
    avoid: string[];
  };
  seasonTip: string;
}

export function useDailyAnalysis() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['daily-analysis', user?.id],
    queryFn: async (): Promise<DailyAnalysis | null> => {
      if (!user) return null;

      const { data, error } = await supabase.functions.invoke('daily-analysis');

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
