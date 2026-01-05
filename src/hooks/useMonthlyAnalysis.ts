import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { startOfMonth, format } from 'date-fns';

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
        .eq('owner_id', user.id)
        .eq('insight_type', 'monthly-analysis')
        .eq('insight_date', monthKey)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const insightData = data.insight_data as Record<string, unknown>;
      return {
        ...insightData,
        generatedAt: data.created_at,
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
        .eq('owner_id', user.id)
        .eq('insight_type', 'monthly-analysis')
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

  return useMutation({
    mutationFn: async (): Promise<MonthlyAnalysis> => {
      const { data, error } = await supabase.functions.invoke('monthly-analysis');

      if (error) throw error;
      if (data.error) throw new Error(data.message || data.error);

      const analysis = data as MonthlyAnalysis;
      const monthKey = format(startOfMonth(new Date()), 'yyyy-MM-dd');

      // Save to ai_insights_cache for persistence
      if (user) {
        // First try to delete existing, then insert new
        await supabase
          .from('ai_insights_cache')
          .delete()
          .eq('owner_id', user.id)
          .eq('insight_type', 'monthly-analysis')
          .eq('insight_date', monthKey);

        await supabase
          .from('ai_insights_cache')
          .insert({
            owner_id: user.id,
            insight_type: 'monthly-analysis',
            insight_date: monthKey,
            // Cast to the expected JSON type
            insight_data: JSON.parse(JSON.stringify(analysis)),
          });
      }

      return analysis;
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
        .eq('owner_id', user.id)
        .eq('insight_type', 'monthly-analysis')
        .eq('insight_date', monthKey)
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
