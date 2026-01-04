import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, subDays, differenceInDays, addDays } from 'date-fns';

// Types
export interface CyclePreferences {
  id: string;
  owner_id: string;
  hormonal_contraception: boolean;
  has_iud: boolean;
  breastfeeding: boolean;
  recently_pregnant: boolean;
  perimenopause: boolean;
  pcos: boolean;
  avg_cycle_length: number | null;
  cycle_variability: number | null;
  avg_period_length: number | null;
  luteal_phase_length: number;
  show_fertile_days: boolean;
  reminders_enabled: boolean;
  onboarding_completed: boolean;
}

export interface Cycle {
  id: string;
  owner_id: string;
  start_date: string;
  end_date: string | null;
  computed_cycle_length: number | null;
  is_anovulatory: boolean;
  notes: string | null;
}

export interface BleedingLog {
  id: string;
  owner_id: string;
  log_date: string;
  intensity: string;
  pain_score: number | null;
  is_intermenstrual: boolean;
  notes: string | null;
}

export interface CycleSymptomLog {
  id: string;
  owner_id: string;
  log_date: string;
  energy: number | null;
  mood: number | null;
  sleep_quality: number | null;
  libido: number | null;
  cravings: string | null;
  headache: boolean;
  breast_tender: boolean;
  anxiety: boolean;
  hot_flashes: boolean;
  bloating: boolean;
  irritability: boolean;
  tags: string[];
  notes: string | null;
}

export interface CyclePrediction {
  id: string;
  owner_id: string;
  generated_at: string;
  current_phase: string;
  current_season: string;
  next_period_start_min: string | null;
  next_period_start_max: string | null;
  next_period_confidence: number | null;
  ovulation_min: string | null;
  ovulation_max: string | null;
  ovulation_confidence: number | null;
  fertile_window_start: string | null;
  fertile_window_end: string | null;
  fertile_confidence: number | null;
  avg_cycle_length: number | null;
  cycle_variability: number | null;
  rationale: string | null;
  ai_tips: unknown;
  watchouts: string[];
}

// Season/phase mapping
export const phaseToSeason: Record<string, string> = {
  menstruatie: 'winter',
  folliculair: 'lente',
  ovulatie: 'zomer',
  luteaal: 'herfst',
  onbekend: 'onbekend',
};

export const seasonColors: Record<string, { bg: string; text: string; accent: string }> = {
  winter: { bg: 'bg-blue-50', text: 'text-blue-800', accent: 'bg-blue-500' },
  lente: { bg: 'bg-green-50', text: 'text-green-800', accent: 'bg-green-500' },
  zomer: { bg: 'bg-amber-50', text: 'text-amber-800', accent: 'bg-amber-500' },
  herfst: { bg: 'bg-orange-50', text: 'text-orange-800', accent: 'bg-orange-500' },
  onbekend: { bg: 'bg-gray-50', text: 'text-gray-800', accent: 'bg-gray-500' },
};

export const seasonLabels: Record<string, string> = {
  winter: 'Winter',
  lente: 'Lente',
  zomer: 'Zomer',
  herfst: 'Herfst',
  onbekend: 'Onbekend',
};

export const phaseLabels: Record<string, string> = {
  menstruatie: 'Menstruatie',
  folliculair: 'Folliculaire fase',
  ovulatie: 'Ovulatie',
  luteaal: 'Luteale fase',
  onbekend: 'Onbekend',
};

// Hooks
export function useCyclePreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cycle-preferences', user?.id],
    queryFn: async (): Promise<CyclePreferences | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('cycle_preferences')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const upsertPreferences = useMutation({
    mutationFn: async (prefs: Partial<CyclePreferences>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('cycle_preferences')
        .upsert({ owner_id: user.id, ...prefs }, { onConflict: 'owner_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-preferences', user?.id] });
    },
  });

  return { ...query, upsertPreferences };
}

export function useCycles(limit = 6) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['cycles', user?.id, limit],
    queryFn: async (): Promise<Cycle[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('owner_id', user.id)
        .order('start_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useBleedingLogs(days = 90) {
  const { user } = useAuth();
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['bleeding-logs', user?.id, days],
    queryFn: async (): Promise<BleedingLog[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('bleeding_logs')
        .select('*')
        .eq('owner_id', user.id)
        .gte('log_date', startDate)
        .order('log_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useCycleSymptomLogs(days = 90) {
  const { user } = useAuth();
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['cycle-symptom-logs', user?.id, days],
    queryFn: async (): Promise<CycleSymptomLog[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('cycle_symptom_logs')
        .select('*')
        .eq('owner_id', user.id)
        .gte('log_date', startDate)
        .order('log_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useLatestPrediction() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cycle-prediction', user?.id],
    queryFn: async (): Promise<CyclePrediction | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('cycle_predictions')
        .select('*')
        .eq('owner_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Mutations
export function useLogBleeding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: Partial<BleedingLog> & { log_date: string; intensity: BleedingLog['intensity'] }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('bleeding_logs')
        .upsert({ owner_id: user.id, ...log }, { onConflict: 'owner_id,log_date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bleeding-logs'] });
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
    },
  });
}

export function useDeleteBleeding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logDate: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('bleeding_logs')
        .delete()
        .eq('owner_id', user.id)
        .eq('log_date', logDate);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bleeding-logs'] });
      queryClient.invalidateQueries({ queryKey: ['bleeding-log'] });
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
    },
  });
}

export function useDeleteAllBleeding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('bleeding_logs')
        .delete()
        .eq('owner_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bleeding-logs'] });
      queryClient.invalidateQueries({ queryKey: ['bleeding-log'] });
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
    },
  });
}

export function useLogCycleSymptoms() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: Partial<CycleSymptomLog> & { log_date: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('cycle_symptom_logs')
        .upsert({ owner_id: user.id, ...log }, { onConflict: 'owner_id,log_date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-symptom-logs'] });
    },
  });
}

export function useStartCycle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (startDate: string) => {
      if (!user) throw new Error('Not authenticated');
      
      // End previous cycle if exists
      const { data: lastCycle } = await supabase
        .from('cycles')
        .select('*')
        .eq('owner_id', user.id)
        .is('end_date', null)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastCycle) {
        const cycleLength = differenceInDays(new Date(startDate), new Date(lastCycle.start_date));
        await supabase
          .from('cycles')
          .update({ 
            end_date: format(subDays(new Date(startDate), 1), 'yyyy-MM-dd'),
            computed_cycle_length: cycleLength,
            is_anovulatory: cycleLength > 45,
          })
          .eq('id', lastCycle.id);
      }

      // Start new cycle
      const { error } = await supabase
        .from('cycles')
        .insert({ owner_id: user.id, start_date: startDate });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['cycle-prediction'] });
    },
  });
}

// Calculation helpers
export function calculateCycleStats(cycles: Cycle[]) {
  if (cycles.length < 2) {
    return { avgLength: null, variability: null, trend: 'onbekend' as const };
  }

  const lengths = cycles
    .filter(c => c.computed_cycle_length)
    .map(c => c.computed_cycle_length!)
    .slice(0, 6);

  if (lengths.length < 2) {
    return { avgLength: null, variability: null, trend: 'onbekend' as const };
  }

  // Calculate median
  const sorted = [...lengths].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const avgLength = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);

  // Calculate variability (standard deviation)
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / lengths.length;
  const variability = Math.round(Math.sqrt(variance));

  // Determine trend
  let trend: 'korter' | 'langer' | 'stabiel' | 'onbekend' = 'stabiel';
  if (lengths.length >= 3) {
    const recent = lengths.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    const older = lengths.slice(-2).reduce((a, b) => a + b, 0) / 2;
    if (recent < older - 3) trend = 'korter';
    else if (recent > older + 3) trend = 'langer';
  }

  return { avgLength, variability, trend };
}

export function calculatePhaseAndPredictions(
  cycles: Cycle[],
  bleedingLogs: BleedingLog[],
  preferences: CyclePreferences | null
): Omit<CyclePrediction, 'id' | 'owner_id' | 'generated_at'> {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const lutealLength = preferences?.luteal_phase_length || 13;

  // Default response
  const defaultResult: Omit<CyclePrediction, 'id' | 'owner_id' | 'generated_at'> = {
    current_phase: 'onbekend',
    current_season: 'onbekend',
    next_period_start_min: null,
    next_period_start_max: null,
    next_period_confidence: null,
    ovulation_min: null,
    ovulation_max: null,
    ovulation_confidence: null,
    fertile_window_start: null,
    fertile_window_end: null,
    fertile_confidence: null,
    avg_cycle_length: null,
    cycle_variability: null,
    rationale: 'Nog niet genoeg data om voorspellingen te maken.',
    ai_tips: {},
    watchouts: [],
  };

  if (cycles.length === 0) return defaultResult;

  const lastCycle = cycles[0];
  const cycleStartDate = new Date(lastCycle.start_date);
  const dayInCycle = differenceInDays(today, cycleStartDate) + 1;

  // Check if currently bleeding
  const todayBleeding = bleedingLogs.find(l => l.log_date === todayStr);
  const isBleeding = todayBleeding && todayBleeding.intensity !== 'spotting';

  // Calculate stats
  const stats = calculateCycleStats(cycles);
  const avgCycleLength = stats.avgLength || 28;
  const variability = stats.variability || 3;

  // Determine current phase
  let currentPhase: CyclePrediction['current_phase'] = 'onbekend';
  
  // Find last bleeding day in current cycle
  const cycleBleedingLogs = bleedingLogs.filter(
    l => new Date(l.log_date) >= cycleStartDate && l.intensity !== 'spotting'
  );
  const periodLength = cycleBleedingLogs.length > 0 ? 
    differenceInDays(
      new Date(cycleBleedingLogs[cycleBleedingLogs.length - 1].log_date),
      cycleStartDate
    ) + 1 : 5;

  const estimatedOvulationDay = avgCycleLength - lutealLength;

  if (isBleeding || dayInCycle <= periodLength) {
    currentPhase = 'menstruatie';
  } else if (dayInCycle < estimatedOvulationDay - 1) {
    currentPhase = 'folliculair';
  } else if (dayInCycle >= estimatedOvulationDay - 1 && dayInCycle <= estimatedOvulationDay + 1) {
    currentPhase = 'ovulatie';
  } else {
    currentPhase = 'luteaal';
  }

  const currentSeason = phaseToSeason[currentPhase] as CyclePrediction['current_season'];

  // Calculate predictions
  const nextPeriodDay = avgCycleLength;
  const nextPeriodDate = addDays(cycleStartDate, nextPeriodDay - 1);
  const confidenceBase = preferences?.perimenopause ? 50 : 70;
  const confidenceAdjusted = Math.max(20, confidenceBase - variability * 5);

  const ovulationDate = addDays(nextPeriodDate, -lutealLength);
  const fertileStart = addDays(ovulationDate, -5);

  // Watchouts
  const watchouts: string[] = [];
  if (avgCycleLength > 45) {
    watchouts.push('Je cycli zijn langer dan gemiddeld. Dit kan bij perimenopauze voorkomen.');
  }
  if (variability > 7) {
    watchouts.push('Je cycluslengte varieert sterk. Voorspellingen zijn minder betrouwbaar.');
  }

  return {
    current_phase: currentPhase,
    current_season: currentSeason,
    next_period_start_min: format(addDays(nextPeriodDate, -variability), 'yyyy-MM-dd'),
    next_period_start_max: format(addDays(nextPeriodDate, variability), 'yyyy-MM-dd'),
    next_period_confidence: confidenceAdjusted,
    ovulation_min: format(addDays(ovulationDate, -2), 'yyyy-MM-dd'),
    ovulation_max: format(addDays(ovulationDate, 2), 'yyyy-MM-dd'),
    ovulation_confidence: Math.max(15, confidenceAdjusted - 10),
    fertile_window_start: format(fertileStart, 'yyyy-MM-dd'),
    fertile_window_end: format(addDays(ovulationDate, 1), 'yyyy-MM-dd'),
    fertile_confidence: Math.max(15, confidenceAdjusted - 10),
    avg_cycle_length: avgCycleLength,
    cycle_variability: variability,
    rationale: variability > 5 
      ? 'Je cyclus is wisselend, voorspellingen zijn een ruime schatting.'
      : 'Op basis van je laatste cycli.',
    ai_tips: {},
    watchouts,
  };
}
