import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { startOfMonth, format } from 'date-fns';
import { useTranslation } from 'react-i18next';

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

// Get saved monthly analysis for current or specific month
export function useSavedMonthlyAnalysis(monthDate?: Date) {
  const { user } = useAuth();
  const targetMonth = monthDate || new Date();
  const monthKey = format(startOfMonth(targetMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['saved-monthly-analysis', user?.id, monthKey],
    queryFn: async (): Promise<MonthlyAnalysis | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('ai_insights_cache')
        .select('insight_data, created_at')
        .eq('owner_id' as never, user.id as never)
        .eq('insight_type' as never, 'monthly-analysis' as never)
        .eq('insight_date' as never, monthKey as never)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const typedData = data as unknown as { insight_data: Record<string, unknown>; created_at: string };
      return {
        ...typedData.insight_data,
        generatedAt: typedData.created_at,
      } as MonthlyAnalysis;
    },
    enabled: !!user,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Get list of all saved monthly analyses
export function useMonthlyAnalysisList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monthly-analysis-list', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('ai_insights_cache')
        .select('id, insight_date, created_at')
        .eq('owner_id' as never, user.id as never)
        .eq('insight_type' as never, 'monthly-analysis' as never)
        .order('insight_date', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useGenerateMonthlyAnalysis() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith('en') ? 'en' : 'nl';

  return useMutation({
    mutationFn: async (): Promise<MonthlyAnalysis> => {
      const { data, error } = await supabase.functions.invoke('monthly-analysis', {
        body: { language }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.message || data.error);

      // The edge function now handles caching, so we just return the result
      return data as MonthlyAnalysis;
    },
    onSuccess: () => {
      const monthKey = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['saved-monthly-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-analysis-list'] });
      queryClient.invalidateQueries({ queryKey: ['can-generate-monthly'] });
    },
  });
}

export function useCanGenerateMonthlyAnalysis() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-generate-monthly', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const monthStart = startOfMonth(new Date());
      const monthKey = format(monthStart, 'yyyy-MM-dd');

      // Check if we already have an analysis for this month
      const { data } = await supabase
        .from('ai_insights_cache')
        .select('id')
        .eq('owner_id' as never, user.id as never)
        .eq('insight_type' as never, 'monthly-analysis' as never)
        .eq('insight_date' as never, monthKey as never)
        .maybeSingle();

      return !data; // Can generate if no analysis exists for this month
    },
    enabled: !!user,
  });
}

// Legacy export for compatibility
export function useMonthlyAnalysis() {
  return useSavedMonthlyAnalysis();
}
