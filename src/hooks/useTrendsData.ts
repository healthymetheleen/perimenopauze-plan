import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import { useSleepSessions, calculateSleepStats } from './useSleep';
import { useLatestPrediction, useCyclePreferences, getSeasonForDate } from './useCycle';

export type TrendPeriod = 7 | 14 | 28 | 'cycle';
export type TrendFocus = 'all' | 'energie' | 'slaap' | 'onrust' | 'sport';

export interface TrendDayData {
  date: string;
  dayOfWeek: string;
  score: number | null;
  mealsCount: number;
  kcalTotal: number;
  proteinG: number;
  carbsG: number;
  fiberG: number;
  fatG: number;
  season: 'winter' | 'lente' | 'zomer' | 'herfst' | 'onbekend';
  sleepDurationMin: number | null;
  sleepQuality: number | null;
  lastMealTime: string | null;
  firstMealTime: string | null;
  eatingWindowMin: number | null;
  upfDays: number;
  // Symptoms
  energy: number | null;
  mood: number | null;
  cravings: string | null;
  headache: boolean;
  anxiety: boolean;
  irritability: boolean;
  bloating: boolean;
  breastTender: boolean;
  hotFlashes: boolean;
}

export interface TrendsKPIs {
  dataCompleteness: { logged: number; total: number; missing: string[] };
  sleepAvg: { hours: number; trend: 'up' | 'down' | 'stable' | null };
  eatingMomentsAvg: { count: number; flag: boolean };
  caloriesAvg: { min: number; max: number };
  proteinAvg: { grams: number; perKg: number | null };
  fiberAvg: { grams: number; trend: 'up' | 'down' | 'stable' | null };
  lastMealAvg: { time: string | null };
  caffeineAfter14: { days: number };
}

export interface Correlation {
  trigger: string;
  effect: string;
  strength: 'laag' | 'matig' | 'hoog';
  description: string;
}

export interface TopSymptom {
  code: string;
  label: string;
  avgIntensity: number;
  trend: 'up' | 'down' | 'stable';
  peakSeason: string;
  count: number;
}

export interface EatingPatternStats {
  avgMealsPerDay: number;
  avgEatingWindowHours: number;
  avgFirstMealTime: string | null;
  avgLastMealTime: string | null;
  snackRatio: number;
  rhythmScore: number;
}

export function useTrendsData(period: TrendPeriod, showSeasonOverlay: boolean = true) {
  const { user } = useAuth();
  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  
  const days = period === 'cycle' ? (preferences?.avg_cycle_length || 28) : period;
  const { data: sleepSessions } = useSleepSessions(days);

  const query = useQuery({
    queryKey: ['trends-data', user?.id, days],
    queryFn: async () => {
      if (!user) return null;
      
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      // Fetch all data in parallel
      const [scoresRes, mealsRes, symptomsRes, cyclesRes] = await Promise.all([
        supabase
          .from('v_daily_scores')
          .select('*')
          .eq('owner_id', user.id)
          .gte('day_date', startDate)
          .order('day_date', { ascending: true }),
        supabase
          .from('meals')
          .select('*, diary_days!inner(day_date)')
          .eq('owner_id', user.id)
          .gte('diary_days.day_date', startDate),
        supabase
          .from('cycle_symptom_logs')
          .select('*')
          .eq('owner_id', user.id)
          .gte('log_date', startDate),
        supabase
          .from('cycles')
          .select('*')
          .eq('owner_id', user.id)
          .order('start_date', { ascending: false })
          .limit(1),
      ]);

      return {
        scores: scoresRes.data || [],
        meals: mealsRes.data || [],
        symptoms: symptomsRes.data || [],
        latestCycle: cyclesRes.data?.[0] || null,
      };
    },
    enabled: !!user,
  });

  // Process the data into trend day data
  const trendDays: TrendDayData[] = [];
  const today = new Date();
  
  if (query.data) {
    const { scores, meals, symptoms, latestCycle } = query.data;
    
    const cycleStartDate = latestCycle ? parseISO(latestCycle.start_date) : today;
    const avgCycleLength = preferences?.avg_cycle_length || 28;
    const periodLength = preferences?.avg_period_length || 5;
    const lutealLength = preferences?.luteal_phase_length || 13;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayScore = scores.find(s => s.day_date === dateStr);
      const dayMeals = meals.filter((m: any) => m.diary_days?.day_date === dateStr);
      const daySymptoms = symptoms.find(s => s.log_date === dateStr);
      const daySleep = sleepSessions?.find(s => {
        const sleepDate = format(parseISO(s.sleep_start), 'yyyy-MM-dd');
        return sleepDate === dateStr || format(subDays(parseISO(s.sleep_start), 1), 'yyyy-MM-dd') === dateStr;
      });
      
      // Calculate eating window
      const mealTimes = dayMeals
        .filter((m: any) => m.time_local)
        .map((m: any) => m.time_local)
        .sort();
      
      const firstMeal = mealTimes[0] || null;
      const lastMeal = mealTimes[mealTimes.length - 1] || null;
      
      let eatingWindowMin = null;
      if (firstMeal && lastMeal) {
        const [fh, fm] = firstMeal.split(':').map(Number);
        const [lh, lm] = lastMeal.split(':').map(Number);
        eatingWindowMin = (lh * 60 + lm) - (fh * 60 + fm);
      }
      
      // Get season for date
      const season = showSeasonOverlay 
        ? getSeasonForDate(date, cycleStartDate, avgCycleLength, periodLength, lutealLength)
        : 'onbekend';
      
      trendDays.push({
        date: dateStr,
        dayOfWeek: format(date, 'EEE'),
        score: dayScore?.day_score ?? null,
        mealsCount: dayScore?.meals_count || dayMeals.length,
        kcalTotal: dayScore?.kcal_total || dayMeals.reduce((sum: number, m: any) => sum + (m.kcal || 0), 0),
        proteinG: dayScore?.protein_g || dayMeals.reduce((sum: number, m: any) => sum + (m.protein_g || 0), 0),
        carbsG: dayScore?.carbs_g || 0,
        fiberG: dayScore?.fiber_g || dayMeals.reduce((sum: number, m: any) => sum + (m.fiber_g || 0), 0),
        fatG: dayMeals.reduce((sum: number, m: any) => sum + (m.fat_g || 0), 0),
        season,
        sleepDurationMin: daySleep?.duration_minutes || null,
        sleepQuality: daySleep?.quality_score || null,
        lastMealTime: lastMeal,
        firstMealTime: firstMeal,
        eatingWindowMin,
        upfDays: dayMeals.filter((m: any) => m.ultra_processed_level && m.ultra_processed_level >= 3).length > 0 ? 1 : 0,
        energy: daySymptoms?.energy || null,
        mood: daySymptoms?.mood || null,
        cravings: daySymptoms?.cravings || null,
        headache: daySymptoms?.headache || false,
        anxiety: daySymptoms?.anxiety || false,
        irritability: daySymptoms?.irritability || false,
        bloating: daySymptoms?.bloating || false,
        breastTender: daySymptoms?.breast_tender || false,
        hotFlashes: daySymptoms?.hot_flashes || false,
      });
    }
  }

  // Calculate KPIs
  const kpis = calculateKPIs(trendDays, days, sleepSessions || []);
  
  // Calculate correlations
  const correlations = calculateCorrelations(trendDays);
  
  // Calculate top symptoms
  const topSymptoms = calculateTopSymptoms(trendDays);
  
  // Calculate eating pattern stats
  const eatingPatternStats = calculateEatingPatternStats(trendDays);

  return {
    ...query,
    trendDays,
    kpis,
    correlations,
    topSymptoms,
    eatingPatternStats,
    currentSeason: prediction?.current_season || 'onbekend',
    nextSeason: getNextSeason(prediction?.current_season || 'onbekend'),
    daysUntilNextSeason: prediction?.next_period_start_min 
      ? differenceInDays(parseISO(prediction.next_period_start_min), today) 
      : null,
  };
}

function calculateKPIs(trendDays: TrendDayData[], totalDays: number, sleepSessions: any[]): TrendsKPIs {
  const daysWithData = trendDays.filter(d => d.mealsCount > 0);
  const daysWithSleep = trendDays.filter(d => d.sleepDurationMin !== null);
  
  // Data completeness
  const missing: string[] = [];
  if (daysWithData.length < totalDays * 0.5) missing.push('maaltijden');
  if (daysWithSleep.length < totalDays * 0.3) missing.push('slaap');
  const daysWithSymptoms = trendDays.filter(d => d.energy !== null || d.mood !== null);
  if (daysWithSymptoms.length < totalDays * 0.3) missing.push('klachten');
  
  // Sleep avg
  const sleepStats = calculateSleepStats(sleepSessions);
  const sleepTrend = sleepStats.avgDurationHours >= 7 ? 'up' : sleepStats.avgDurationHours >= 6 ? 'stable' : 'down';
  
  // Eating moments
  const avgMeals = daysWithData.length > 0 
    ? daysWithData.reduce((sum, d) => sum + d.mealsCount, 0) / daysWithData.length 
    : 0;
  
  // Calories
  const kcals = daysWithData.filter(d => d.kcalTotal > 0).map(d => d.kcalTotal);
  const minKcal = kcals.length > 0 ? Math.min(...kcals) : 0;
  const maxKcal = kcals.length > 0 ? Math.max(...kcals) : 0;
  
  // Protein
  const avgProtein = daysWithData.length > 0
    ? daysWithData.reduce((sum, d) => sum + d.proteinG, 0) / daysWithData.length
    : 0;
  
  // Fiber
  const avgFiber = daysWithData.length > 0
    ? daysWithData.reduce((sum, d) => sum + d.fiberG, 0) / daysWithData.length
    : 0;
  const fiberTrend = avgFiber >= 30 ? 'up' : avgFiber >= 20 ? 'stable' : 'down';
  
  // Last meal avg
  const lastMealTimes = trendDays.filter(d => d.lastMealTime).map(d => {
    const [h, m] = d.lastMealTime!.split(':').map(Number);
    return h * 60 + m;
  });
  const avgLastMealMin = lastMealTimes.length > 0 
    ? lastMealTimes.reduce((a, b) => a + b, 0) / lastMealTimes.length 
    : null;
  const avgLastMealTime = avgLastMealMin !== null 
    ? `${Math.floor(avgLastMealMin / 60).toString().padStart(2, '0')}:${Math.round(avgLastMealMin % 60).toString().padStart(2, '0')}`
    : null;
  
  // Caffeine after 14:00 - would need meal description data, placeholder for now
  const caffeineAfter14Days = 0;

  return {
    dataCompleteness: { logged: daysWithData.length, total: totalDays, missing },
    sleepAvg: { hours: sleepStats.avgDurationHours, trend: daysWithSleep.length > 0 ? sleepTrend : null },
    eatingMomentsAvg: { count: Math.round(avgMeals * 10) / 10, flag: avgMeals > 6 },
    caloriesAvg: { min: Math.round(minKcal), max: Math.round(maxKcal) },
    proteinAvg: { grams: Math.round(avgProtein), perKg: null }, // Would need weight data
    fiberAvg: { grams: Math.round(avgFiber), trend: fiberTrend },
    lastMealAvg: { time: avgLastMealTime },
    caffeineAfter14: { days: caffeineAfter14Days },
  };
}

function calculateCorrelations(trendDays: TrendDayData[]): Correlation[] {
  const correlations: Correlation[] = [];
  
  // Late eating vs sleep quality
  const lateMealDays = trendDays.filter(d => {
    if (!d.lastMealTime) return false;
    const [h] = d.lastMealTime.split(':').map(Number);
    return h >= 21;
  });
  const lateMealWithBadSleep = lateMealDays.filter(d => d.sleepQuality !== null && d.sleepQuality < 6);
  if (lateMealDays.length >= 3 && lateMealWithBadSleep.length / lateMealDays.length > 0.5) {
    correlations.push({
      trigger: 'Laat eten na 21:00',
      effect: 'Slaapkwaliteit lager',
      strength: lateMealWithBadSleep.length / lateMealDays.length > 0.7 ? 'hoog' : 'matig',
      description: `Op ${lateMealWithBadSleep.length} van ${lateMealDays.length} dagen met laat eten was je slaap minder goed.`,
    });
  }
  
  // Low breakfast protein vs low energy
  const lowProteinBreakfastDays = trendDays.filter(d => {
    // Simplified: if total protein is low and has meals
    return d.mealsCount > 0 && d.proteinG / d.mealsCount < 20;
  });
  const lowProteinWithLowEnergy = lowProteinBreakfastDays.filter(d => d.energy !== null && d.energy < 5);
  if (lowProteinBreakfastDays.length >= 3 && lowProteinWithLowEnergy.length / lowProteinBreakfastDays.length > 0.4) {
    correlations.push({
      trigger: 'Ontbijt eiwit laag',
      effect: 'Energie lager',
      strength: lowProteinWithLowEnergy.length / lowProteinBreakfastDays.length > 0.6 ? 'hoog' : 'matig',
      description: `Op ${lowProteinWithLowEnergy.length} dagen met weinig ontbijteiwit was je energie lager.`,
    });
  }
  
  // Many eating moments vs unrest
  const highMealDays = trendDays.filter(d => d.mealsCount > 5);
  const highMealWithUnrest = highMealDays.filter(d => d.anxiety || d.irritability);
  if (highMealDays.length >= 2 && highMealWithUnrest.length > 0) {
    correlations.push({
      trigger: 'Veel eetmomenten (>5)',
      effect: 'Onrust hoger',
      strength: 'laag',
      description: `Op dagen met veel eetmomenten was je vaker onrustig.`,
    });
  }
  
  return correlations.slice(0, 3);
}

function calculateTopSymptoms(trendDays: TrendDayData[]): TopSymptom[] {
  // Updated symptoms based on user's actual tracking:
  // Energie, Stemming, Hoofdpijn, Gevoelige borsten, Angst/onrust, Opvliegers, Opgeblazen, Prikkelbaar
  const symptomCounts: Record<string, { count: number; seasons: string[] }> = {
    onrust: { count: 0, seasons: [] },
    prikkelbaar: { count: 0, seasons: [] },
    hoofdpijn: { count: 0, seasons: [] },
    bloating: { count: 0, seasons: [] },
    borsten: { count: 0, seasons: [] },
    opvliegers: { count: 0, seasons: [] },
  };
  
  trendDays.forEach(d => {
    if (d.anxiety) { symptomCounts.onrust.count++; symptomCounts.onrust.seasons.push(d.season); }
    if (d.irritability) { symptomCounts.prikkelbaar.count++; symptomCounts.prikkelbaar.seasons.push(d.season); }
    if (d.headache) { symptomCounts.hoofdpijn.count++; symptomCounts.hoofdpijn.seasons.push(d.season); }
    if (d.bloating) { symptomCounts.bloating.count++; symptomCounts.bloating.seasons.push(d.season); }
    if (d.breastTender) { symptomCounts.borsten.count++; symptomCounts.borsten.seasons.push(d.season); }
    if (d.hotFlashes) { symptomCounts.opvliegers.count++; symptomCounts.opvliegers.seasons.push(d.season); }
  });
  
  const labels: Record<string, string> = {
    onrust: 'Angst/onrust',
    prikkelbaar: 'Prikkelbaar',
    hoofdpijn: 'Hoofdpijn',
    bloating: 'Opgeblazen',
    borsten: 'Gevoelige borsten',
    opvliegers: 'Opvliegers',
  };
  
  return Object.entries(symptomCounts)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([code, data]) => {
      const peakSeason = getMostFrequent(data.seasons) || 'onbekend';
      return {
        code,
        label: labels[code] || code,
        avgIntensity: Math.round((data.count / trendDays.length) * 10),
        trend: 'stable' as const,
        peakSeason,
        count: data.count,
      };
    });
}

function calculateEatingPatternStats(trendDays: TrendDayData[]): EatingPatternStats {
  const daysWithMeals = trendDays.filter(d => d.mealsCount > 0);
  
  const avgMealsPerDay = daysWithMeals.length > 0
    ? daysWithMeals.reduce((sum, d) => sum + d.mealsCount, 0) / daysWithMeals.length
    : 0;
  
  const windowMinutes = daysWithMeals
    .filter(d => d.eatingWindowMin !== null)
    .map(d => d.eatingWindowMin!);
  const avgEatingWindowHours = windowMinutes.length > 0
    ? windowMinutes.reduce((a, b) => a + b, 0) / windowMinutes.length / 60
    : 0;
  
  const firstMealTimes = daysWithMeals.filter(d => d.firstMealTime).map(d => {
    const [h, m] = d.firstMealTime!.split(':').map(Number);
    return h * 60 + m;
  });
  const avgFirstMealMin = firstMealTimes.length > 0 
    ? firstMealTimes.reduce((a, b) => a + b, 0) / firstMealTimes.length 
    : null;
  
  const lastMealTimes = daysWithMeals.filter(d => d.lastMealTime).map(d => {
    const [h, m] = d.lastMealTime!.split(':').map(Number);
    return h * 60 + m;
  });
  const avgLastMealMin = lastMealTimes.length > 0 
    ? lastMealTimes.reduce((a, b) => a + b, 0) / lastMealTimes.length 
    : null;
  
  // Rhythm score: based on consistency of eating times
  const firstMealVariance = calculateVariance(firstMealTimes);
  const rhythmScore = Math.max(0, Math.min(100, 100 - Math.sqrt(firstMealVariance) / 3));
  
  return {
    avgMealsPerDay: Math.round(avgMealsPerDay * 10) / 10,
    avgEatingWindowHours: Math.round(avgEatingWindowHours * 10) / 10,
    avgFirstMealTime: avgFirstMealMin !== null 
      ? `${Math.floor(avgFirstMealMin / 60).toString().padStart(2, '0')}:${Math.round(avgFirstMealMin % 60).toString().padStart(2, '0')}`
      : null,
    avgLastMealTime: avgLastMealMin !== null 
      ? `${Math.floor(avgLastMealMin / 60).toString().padStart(2, '0')}:${Math.round(avgLastMealMin % 60).toString().padStart(2, '0')}`
      : null,
    snackRatio: avgMealsPerDay > 3 ? (avgMealsPerDay - 3) / avgMealsPerDay : 0,
    rhythmScore: Math.round(rhythmScore),
  };
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}

function getMostFrequent(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const counts = arr.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function getNextSeason(current: string): string {
  const order = ['winter', 'lente', 'zomer', 'herfst'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % 4];
}
