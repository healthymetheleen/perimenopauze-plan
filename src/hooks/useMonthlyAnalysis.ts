import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface MonthlyAnalysisPattern {
  domain: 'sleep' | 'food' | 'cycle' | 'mood' | 'energy';
  observation: string;
  hormoneContext: string;
}

export interface MonthlyAnalysis {
  summary: string;
  patterns: MonthlyAnalysisPattern[];
  hormoneAnalysis: string;
  nutritionInsights: string;
  sleepAnalysis?: string;
  movementAnalysis?: string;
  recommendations: string[];
  talkToProvider?: string;
  positiveNote?: string;
  disclaimer: string;
  generatedAt: string;
}

export function useMonthlyAnalysis() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monthly-analysis', user?.id],
    queryFn: async (): Promise<MonthlyAnalysis | null> => {
      // Check if we already have a recent analysis (within this month)
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user?.id)
        .eq('function_name', 'monthly-analysis')
        .gte('created_at', monthStart.toISOString());

      // Return null if already generated this month - user needs to trigger manually
      if ((count || 0) > 0) {
        return null;
      }

      return null;
    },
    enabled: !!user,
  });
}

export function useGenerateMonthlyAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<MonthlyAnalysis> => {
      const { data, error } = await supabase.functions.invoke('monthly-analysis');

      if (error) throw error;
      if (data.error) throw new Error(data.message || data.error);

      return data as MonthlyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['monthly-analysis-result'], data);
    },
  });
}

export function useCanGenerateMonthlyAnalysis() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-generate-monthly', user?.id],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user?.id)
        .eq('function_name', 'monthly-analysis')
        .gte('created_at', monthStart.toISOString());

      return (count || 0) === 0;
    },
    enabled: !!user,
  });
}
