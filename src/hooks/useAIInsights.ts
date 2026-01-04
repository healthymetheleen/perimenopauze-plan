import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useConsent } from '@/hooks/useConsent';
import { trackAIUsage } from '@/hooks/useAIUsage';

export interface DailyInsight {
  pattern: string;
  context: string;
  reflection: string;
  disclaimer?: string;
}

export interface WeeklyInsight {
  theme: string;
  variation: string;
  normalization: string;
  insight: string;
  disclaimer?: string;
}

export interface SleepInsight {
  sleepPattern: string;
  connection: string;
  normalization: string;
  cycleContext?: string;
  disclaimer?: string;
}

export interface CycleInsight {
  season: string;
  experience: string;
  observation: string;
  invitation: string;
  disclaimer?: string;
}

type InsightType = 'daily' | 'weekly' | 'sleep' | 'cycle';

interface InsightData {
  // Daily
  mealsCount?: number;
  sleepQuality?: string;
  stressLevel?: string;
  cycleSeason?: string;
  movement?: string;
  energy?: string;
  // Weekly
  patterns?: Record<string, unknown>;
  // Sleep
  avgDuration?: string;
  avgQuality?: string;
  consistency?: string;
  interruptions?: string;
  // Cycle
  season?: string;
  phase?: string;
  stress?: string;
}

export function useAIInsight<T>(type: InsightType, data: InsightData, enabled: boolean = true) {
  const { user } = useAuth();
  const { consent } = useConsent();
  const hasAIConsent = consent?.accepted_ai_processing === true;

  return useQuery({
    queryKey: ['ai-insight', type, user?.id, JSON.stringify(data)],
    queryFn: async (): Promise<T> => {
      if (!user) throw new Error('Not authenticated');
      
      // Track usage
      const canProceed = await trackAIUsage(`premium-insights-${type}`);
      if (!canProceed) {
        throw new Error('Dagelijkse AI-limiet bereikt');
      }

      const { data: result, error } = await supabase.functions.invoke('premium-insights', {
        body: { type, data, hasAIConsent }
      });

      if (error) throw error;
      return result as T;
    },
    enabled: enabled && !!user && hasAIConsent && Object.keys(data).length > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
  });
}

export function useDailyInsight(data: InsightData, enabled: boolean = true) {
  return useAIInsight<DailyInsight>('daily', data, enabled);
}

export function useWeeklyInsight(data: InsightData, enabled: boolean = true) {
  return useAIInsight<WeeklyInsight>('weekly', data, enabled);
}

export function useSleepInsight(data: InsightData, enabled: boolean = true) {
  return useAIInsight<SleepInsight>('sleep', data, enabled);
}

export function useCycleInsight(data: InsightData, enabled: boolean = true) {
  return useAIInsight<CycleInsight>('cycle', data, enabled);
}

// Manual refresh hook
export function useRefreshInsight() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ type, data, hasAIConsent }: { type: InsightType; data: InsightData; hasAIConsent: boolean }) => {
      const canProceed = await trackAIUsage(`premium-insights-${type}`);
      if (!canProceed) {
        throw new Error('Dagelijkse AI-limiet bereikt');
      }

      const { data: result, error } = await supabase.functions.invoke('premium-insights', {
        body: { type, data, hasAIConsent }
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-insight', variables.type] });
    },
  });
}
