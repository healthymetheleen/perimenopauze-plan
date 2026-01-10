import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getExerciseImage } from '@/lib/exerciseImages';

// Database exercise type (from Supabase)
export interface DbExercise {
  id: string;
  name: string;
  name_dutch: string;
  description: string | null;
  duration: string;
  benefits: string[] | null;
  image_url: string | null;
  video_url: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  cycle_phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
  sort_order: number | null;
  is_active: boolean | null;
}

// Phase workout configuration
export interface PhaseWorkout {
  phase: string;
  phaseKey: string;
  season: string;
  descriptionKey: string;
  intensity: 'low' | 'moderate' | 'high';
  recommendedMinutes: number;
  exercises: DbExercise[];
}

// Training preferences type
export interface TrainingPreferences {
  sessionsPerWeek: number;
  minutesPerSession: number;
  preferredDays: string[];
  excludedDays?: string[];
  goals: string[];
}

// Phase to season mapping
const phaseToSeason: Record<string, string> = {
  menstrual: 'winter',
  follicular: 'lente',
  ovulatory: 'zomer',
  luteal: 'herfst',
};

// Phase workout configurations (static metadata)
const phaseConfig: Record<string, Omit<PhaseWorkout, 'exercises'>> = {
  menstrual: {
    phase: 'menstrual',
    phaseKey: 'exercises.phases.menstrual',
    season: 'winter',
    descriptionKey: 'exercises.phase_descriptions.menstrual',
    intensity: 'low',
    recommendedMinutes: 15,
  },
  follicular: {
    phase: 'follicular',
    phaseKey: 'exercises.phases.follicular',
    season: 'lente',
    descriptionKey: 'exercises.phase_descriptions.follicular',
    intensity: 'moderate',
    recommendedMinutes: 30,
  },
  ovulatory: {
    phase: 'ovulatory',
    phaseKey: 'exercises.phases.ovulatory',
    season: 'zomer',
    descriptionKey: 'exercises.phase_descriptions.ovulatory',
    intensity: 'high',
    recommendedMinutes: 45,
  },
  luteal: {
    phase: 'luteal',
    phaseKey: 'exercises.phases.luteal',
    season: 'herfst',
    descriptionKey: 'exercises.phase_descriptions.luteal',
    intensity: 'moderate',
    recommendedMinutes: 25,
  },
};

// Hook to fetch exercises from database
export function useExercisesFromDb() {
  return useQuery({
    queryKey: ['exercises-db'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_active' as never, true as never)
        .order('cycle_phase')
        .order('sort_order');

      if (error) throw error;
      
      // Add local images as fallback
      return ((data as unknown as DbExercise[]) || []).map(exercise => ({
        ...exercise,
        image_url: getExerciseImage(exercise.name, exercise.image_url),
      }));
    },
  });
}

// Hook to get phase workouts with database exercises
export function usePhaseWorkouts() {
  const { data: exercises, isLoading, error } = useExercisesFromDb();

  const phaseWorkouts: PhaseWorkout[] = Object.entries(phaseConfig).map(([phase, config]) => ({
    ...config,
    exercises: exercises?.filter(e => e.cycle_phase === phase) || [],
  }));

  return {
    phaseWorkouts,
    isLoading,
    error,
  };
}

// Get workout for a specific season
export function getWorkoutForSeasonFromWorkouts(
  phaseWorkouts: PhaseWorkout[],
  season: string
): PhaseWorkout | undefined {
  return phaseWorkouts.find(w => w.season === season);
}

// Legacy exports for backwards compatibility
export const phaseWorkouts: PhaseWorkout[] = Object.entries(phaseConfig).map(([phase, config]) => ({
  ...config,
  exercises: [],
}));

export function getWorkoutForPhase(phase: string): PhaseWorkout | undefined {
  return phaseWorkouts.find(w => w.phase === phase);
}

export function getWorkoutForSeason(season: string): PhaseWorkout | undefined {
  return phaseWorkouts.find(w => w.season === season);
}
