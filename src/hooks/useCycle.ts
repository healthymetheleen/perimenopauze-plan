import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, subDays, differenceInDays, addDays, startOfDay } from 'date-fns';

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

/**
 * Calculate the season (cycle phase) for a given date based on cycle syncing logic.
 * 
 * Seasons map to cycle phases:
 * - Winter = menstruatie (dag 1 t/m periodLength)
 * - Lente = folliculair (dag na bloeding t/m dag vóór ovulatie)
 * - Zomer = ovulatie (ovulatiedag ± 1 dag)
 * - Herfst = luteaal (dag na ovulatie t/m dag vóór volgende menstruatie)
 * 
 * Calculation:
 * - Ovulation day (OD) = avgCycleLength - lutealLength
 * - Fertile window = OD - 5 t/m OD (covered separately in fertile_window_* fields)
 */
export function getSeasonForDate(
  date: Date,
  cycleStartDate: Date,
  avgCycleLength: number,
  periodLength: number,
  lutealLength: number
): 'winter' | 'lente' | 'zomer' | 'herfst' | 'onbekend' {
  const dayInCycle = differenceInDays(startOfDay(date), startOfDay(cycleStartDate)) + 1;
  
  if (dayInCycle < 1) return 'onbekend';
  
  // Handle cycles that extend beyond avgCycleLength (normalize to position within a cycle)
  const normalizedDay = ((dayInCycle - 1) % avgCycleLength) + 1;
  
  // Calculate ovulation day: OD = avgCycleLength - lutealLength
  const ovulationDay = avgCycleLength - lutealLength;
  
  // Winter = menstruatie (dag 1 t/m periodLength)
  if (normalizedDay <= periodLength) {
    return 'winter';
  }
  
  // Lente = folliculair (dag na bloeding t/m dag vóór ovulatie - 1)
  // This is day (periodLength + 1) to (ovulationDay - 2)
  if (normalizedDay < ovulationDay - 1) {
    return 'lente';
  }
  
  // Zomer = ovulatie (ovulatiedag en 1 dag ervoor en erna, dus OD-1 t/m OD+1)
  if (normalizedDay >= ovulationDay - 1 && normalizedDay <= ovulationDay + 1) {
    return 'zomer';
  }
  
  // Herfst = luteaal (dag na ovulatie t/m einde cyclus)
  return 'herfst';
}

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
  const { data: cycles } = useCycles(6);
  const { data: bleedingLogs } = useBleedingLogs(90);
  const { data: preferences } = useCyclePreferences();

  return useQuery({
    queryKey: ['cycle-prediction', user?.id, cycles?.length, bleedingLogs?.length],
    queryFn: async (): Promise<CyclePrediction | null> => {
      if (!user) return null;
      
      // First try to get stored prediction
      const { data: stored } = await supabase
        .from('cycle_predictions')
        .select('*')
        .eq('owner_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Always calculate fresh prediction based on current data
      if (cycles && cycles.length > 0) {
        const calculated = calculatePhaseAndPredictions(
          cycles,
          bleedingLogs || [],
          preferences || null
        );
        
        // Return calculated prediction merged with any stored AI tips
        return {
          id: stored?.id || 'calculated',
          owner_id: user.id,
          generated_at: new Date().toISOString(),
          ...calculated,
          ai_tips: stored?.ai_tips || calculated.ai_tips,
          watchouts: calculated.watchouts,
        } as CyclePrediction;
      }
      
      return stored;
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
        
        // Only update previous cycle if the new start date creates a valid cycle (min 7 days)
        // If less than 7 days, we assume user is correcting the previous entry
        if (cycleLength >= 7) {
          await supabase
            .from('cycles')
            .update({ 
              end_date: format(subDays(new Date(startDate), 1), 'yyyy-MM-dd'),
              computed_cycle_length: cycleLength,
              is_anovulatory: cycleLength > 45,
            })
            .eq('id', lastCycle.id);
        } else {
          // If new date is too close to previous cycle start, delete the old one
          // This handles the case where user is correcting a mistake
          await supabase
            .from('cycles')
            .delete()
            .eq('id', lastCycle.id);
          
          // Also remove bleeding log for old date
          await supabase
            .from('bleeding_logs')
            .delete()
            .eq('owner_id', user.id)
            .eq('log_date', lastCycle.start_date);
        }
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
      queryClient.invalidateQueries({ queryKey: ['bleeding-logs'] });
    },
  });
}

export function useDeleteCycle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cycleId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get the cycle to check start_date for bleeding logs
      const { data: cycle } = await supabase
        .from('cycles')
        .select('start_date')
        .eq('id', cycleId)
        .eq('owner_id', user.id)
        .single();
      
      if (!cycle) throw new Error('Cycle not found');
      
      // Delete the cycle
      const { error } = await supabase
        .from('cycles')
        .delete()
        .eq('id', cycleId)
        .eq('owner_id', user.id);
      if (error) throw error;
      
      // Also delete the bleeding log for that start date
      await supabase
        .from('bleeding_logs')
        .delete()
        .eq('owner_id', user.id)
        .eq('log_date', cycle.start_date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['cycle-prediction'] });
      queryClient.invalidateQueries({ queryKey: ['bleeding-logs'] });
    },
  });
}

export function useUpdateCycleStartDate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cycleId, newStartDate, oldStartDate }: { cycleId: string; newStartDate: string; oldStartDate: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Update cycle start date
      const { error } = await supabase
        .from('cycles')
        .update({ start_date: newStartDate })
        .eq('id', cycleId)
        .eq('owner_id', user.id);
      if (error) throw error;
      
      // Update bleeding log from old date to new date
      await supabase
        .from('bleeding_logs')
        .delete()
        .eq('owner_id', user.id)
        .eq('log_date', oldStartDate);
      
      await supabase
        .from('bleeding_logs')
        .upsert(
          { owner_id: user.id, log_date: newStartDate, intensity: 'normaal' },
          { onConflict: 'owner_id,log_date' }
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['cycle-prediction'] });
      queryClient.invalidateQueries({ queryKey: ['bleeding-logs'] });
    },
  });
}

// Calculation helpers
export function calculateCycleStats(cycles: Cycle[]) {
  if (cycles.length < 2) {
    return { avgLength: null, variability: null, trend: 'onbekend' as const };
  }

  // Filter out invalid cycles (must be at least 7 days and at most 60 days)
  const lengths = cycles
    .filter(c => c.computed_cycle_length && c.computed_cycle_length >= 7 && c.computed_cycle_length <= 60)
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

  // Sanity check: if dayInCycle is <= 0 or extremely high, something is wrong with the data
  if (dayInCycle <= 0 || dayInCycle > 100) {
    return {
      ...defaultResult,
      rationale: 'Cyclusdata lijkt niet te kloppen. Controleer je startdatum via "Eerste dag menstruatie".',
    };
  }

  // Check if currently bleeding
  const todayBleeding = bleedingLogs.find(l => l.log_date === todayStr);
  const isBleeding = todayBleeding && todayBleeding.intensity !== 'spotting';

  // Calculate stats - filter out invalid cycle lengths
  const stats = calculateCycleStats(cycles);
  // Use calculated average, fall back to preferences, then 28
  const avgCycleLength = Math.max(21, stats.avgLength || preferences?.avg_cycle_length || 28);
  const variability = stats.variability ?? 3;

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
