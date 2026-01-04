import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, subDays } from 'date-fns';

export interface DiaryDay {
  id: string;
  day_date: string;
  timezone: string;
  data_quality: unknown;
}

export interface Meal {
  id: string;
  day_id: string;
  time_local: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  ultra_processed_level: number | null;
  quality_flags: unknown;
}

export interface DailyScore {
  day_id: string;
  day_date: string;
  day_score: number;
  score_reasons: string[];
  meals_count: number;
  kcal_total?: number;
  protein_g: number;
  carbs_g?: number;
  fiber_g: number;
}

export function useDiaryDay(date: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['diary-day', user?.id, date],
    queryFn: async (): Promise<DiaryDay | null> => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('diary_days')
        .select('*')
        .eq('owner_id', user.id)
        .eq('day_date', date)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createDay = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('diary_days')
        .insert({
          owner_id: user.id,
          day_date: date,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary-day', user?.id, date] });
    },
  });

  return { ...query, createDay };
}

export function useMeals(dayId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meals', dayId],
    queryFn: async (): Promise<Meal[]> => {
      if (!user || !dayId) return [];
      
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('day_id', dayId)
        .eq('owner_id', user.id)
        .order('time_local', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!dayId,
  });
}

export function useDailyScores(days: number = 7) {
  const { user } = useAuth();
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['daily-scores', user?.id, days],
    queryFn: async (): Promise<DailyScore[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('v_daily_scores')
        .select('*')
        .eq('owner_id', user.id)
        .gte('day_date', startDate)
        .order('day_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}
