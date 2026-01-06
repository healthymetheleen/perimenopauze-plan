import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface SleepSession {
  id: string;
  owner_id: string;
  sleep_start: string;
  sleep_end: string | null;
  duration_minutes: number | null;
  quality_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Get sleep sessions for last N days
export function useSleepSessions(days: number = 7) {
  const { user } = useAuth();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['sleep-sessions', user?.id, days],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('sleep_sessions')
        .select('*')
        .eq('owner_id', user.id)
        .gte('sleep_start', startDate.toISOString())
        .order('sleep_start', { ascending: false });
      if (error) throw error;
      return data as SleepSession[];
    },
    enabled: !!user,
  });
}

// Get active sleep session (started but not ended)
export function useActiveSleepSession() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-sleep-session', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('sleep_sessions')
        .select('*')
        .eq('owner_id', user.id)
        .is('sleep_end', null)
        .order('sleep_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SleepSession | null;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute to update duration
  });
}

// Start sleep session
export function useStartSleep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Niet ingelogd');
      const { data, error } = await supabase
        .from('sleep_sessions')
        .insert({
          owner_id: user.id,
          sleep_start: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-sleep-session'] });
    },
  });
}

// Add manual sleep session (for retrospective logging)
export function useAddManualSleep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      sleepStart, 
      sleepEnd, 
      qualityScore 
    }: { 
      sleepStart: string; 
      sleepEnd: string; 
      qualityScore?: number;
    }) => {
      if (!user) throw new Error('Niet ingelogd');
      
      const startTime = new Date(sleepStart);
      const endTime = new Date(sleepEnd);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      
      if (durationMinutes <= 0) {
        throw new Error('Eindtijd moet na starttijd zijn');
      }
      
      const { data, error } = await supabase
        .from('sleep_sessions')
        .insert({
          owner_id: user.id,
          sleep_start: startTime.toISOString(),
          sleep_end: endTime.toISOString(),
          duration_minutes: durationMinutes,
          quality_score: qualityScore,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-sleep-session'] });
    },
  });
}

// End sleep session
export function useEndSleep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, qualityScore }: { sessionId: string; qualityScore?: number }) => {
      const endTime = new Date();
      
      // First get the session to calculate duration
      const { data: session, error: fetchError } = await supabase
        .from('sleep_sessions')
        .select('sleep_start')
        .eq('id', sessionId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const startTime = new Date(session.sleep_start);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      
      const { data, error } = await supabase
        .from('sleep_sessions')
        .update({
          sleep_end: endTime.toISOString(),
          duration_minutes: durationMinutes,
          quality_score: qualityScore,
        })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-sleep-session'] });
    },
  });
}

// Delete sleep session
export function useDeleteSleep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('sleep_sessions')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-sleep-session'] });
    },
  });
}

// Calculate sleep statistics
export function calculateSleepStats(sessions: SleepSession[]) {
  const completedSessions = sessions.filter(s => s.sleep_end && s.duration_minutes);
  
  if (completedSessions.length === 0) {
    return {
      avgDurationMinutes: 0,
      avgDurationHours: 0,
      totalSessions: 0,
      avgQuality: 0,
      avgBedtime: null,
      avgWakeTime: null,
      consistency: 0,
    };
  }

  const totalDuration = completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const avgDurationMinutes = totalDuration / completedSessions.length;
  
  const qualityScores = completedSessions.filter(s => s.quality_score).map(s => s.quality_score!);
  const avgQuality = qualityScores.length > 0 
    ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length 
    : 0;

  // Calculate average bedtime and wake time
  const bedtimes = completedSessions.map(s => {
    const d = new Date(s.sleep_start);
    return d.getHours() * 60 + d.getMinutes();
  });
  const avgBedtimeMinutes = bedtimes.reduce((sum, t) => sum + t, 0) / bedtimes.length;
  
  const waketimes = completedSessions.map(s => {
    const d = new Date(s.sleep_end!);
    return d.getHours() * 60 + d.getMinutes();
  });
  const avgWaketimeMinutes = waketimes.reduce((sum, t) => sum + t, 0) / waketimes.length;

  // Calculate consistency (lower = more consistent)
  const bedtimeVariance = bedtimes.reduce((sum, t) => sum + Math.pow(t - avgBedtimeMinutes, 2), 0) / bedtimes.length;
  const consistency = Math.max(0, 100 - Math.sqrt(bedtimeVariance) / 2);

  return {
    avgDurationMinutes,
    avgDurationHours: avgDurationMinutes / 60,
    totalSessions: completedSessions.length,
    avgQuality,
    avgBedtime: formatMinutesToTime(avgBedtimeMinutes),
    avgWakeTime: formatMinutesToTime(avgWaketimeMinutes),
    consistency,
  };
}

function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = Math.round(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Calculate sleep score (0-100)
export function calculateSleepScore(sessions: SleepSession[]): number {
  const stats = calculateSleepStats(sessions);
  
  if (stats.totalSessions === 0) return 0;
  
  // Ideal sleep is 7-9 hours (420-540 minutes)
  let durationScore = 0;
  if (stats.avgDurationMinutes >= 420 && stats.avgDurationMinutes <= 540) {
    durationScore = 100;
  } else if (stats.avgDurationMinutes < 420) {
    durationScore = Math.max(0, (stats.avgDurationMinutes / 420) * 100);
  } else {
    durationScore = Math.max(0, 100 - ((stats.avgDurationMinutes - 540) / 120) * 50);
  }
  
  // Quality score (0-10 mapped to 0-100)
  const qualityScore = stats.avgQuality * 10;
  
  // Consistency score
  const consistencyScore = stats.consistency;
  
  // Weighted average
  return Math.round((durationScore * 0.4) + (qualityScore * 0.35) + (consistencyScore * 0.25));
}

// Generate personalized sleep advice
export function generateSleepAdvice(sessions: SleepSession[]): string[] {
  const stats = calculateSleepStats(sessions);
  const advice: string[] = [];
  
  if (stats.totalSessions === 0) {
    return ['Begin met het bijhouden van je slaap om persoonlijke adviezen te krijgen.'];
  }
  
  // Duration advice
  if (stats.avgDurationHours < 7) {
    advice.push(`Je slaapt gemiddeld ${stats.avgDurationHours.toFixed(1)} uur. Streef naar 7-9 uur voor optimaal herstel, hormoonbalans en stemming.`);
  } else if (stats.avgDurationHours > 9) {
    advice.push(`Je slaapt gemiddeld ${stats.avgDurationHours.toFixed(1)} uur. Overmatig slapen kan wijzen op onderliggende vermoeidheid of slaapkwaliteitsproblemen.`);
  } else {
    advice.push(`Goed bezig! Je slaapt gemiddeld ${stats.avgDurationHours.toFixed(1)} uur, dat valt binnen het optimale bereik.`);
  }
  
  // Consistency advice
  if (stats.consistency < 70) {
    advice.push('Je slaaptijden variëren sterk. Probeer elke dag op dezelfde tijd naar bed te gaan en op te staan, ook in het weekend.');
  } else if (stats.consistency >= 85) {
    advice.push('Je hebt een consistent slaapritme. Dit ondersteunt je circadiane ritme en hormoonbalans.');
  }
  
  // Quality advice
  if (stats.avgQuality > 0 && stats.avgQuality < 6) {
    advice.push('Je slaapkwaliteit kan beter. Overweeg: geen schermen 1 uur voor bed, koele slaapkamer (16-18°C), donkere kamer.');
  }
  
  // Bedtime advice
  if (stats.avgBedtime) {
    const bedtimeHour = parseInt(stats.avgBedtime.split(':')[0]);
    if (bedtimeHour >= 0 && bedtimeHour < 6) {
      // After midnight
      advice.push('Je gaat vaak na middernacht slapen. Dit kan je melatonineproductie verstoren. Probeer voor 23:00 in bed te liggen.');
    } else if (bedtimeHour >= 23 || bedtimeHour < 6) {
      // Good bedtime range
    } else if (bedtimeHour < 21) {
      advice.push('Je gaat vrij vroeg slapen. Als je moeite hebt met doorslapen, probeer iets later naar bed te gaan.');
    }
  }
  
  // General tips if we have few specific issues
  if (advice.length < 3) {
    advice.push('Vermijd cafeïne na 14:00 en alcohol dicht voor het slapen - beide verstoren je slaaparchitectuur.');
  }
  
  return advice.slice(0, 4); // Max 4 pieces of advice
}
