import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Yoga exercises by cycle phase
export interface YogaExercise {
  id: string;
  nameKey: string; // i18n key for name
  duration: string;
  descriptionKey: string; // i18n key for description  
  benefitsKey: string; // i18n key for benefits array
  imageUrl: string;
  videoUrl?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface PhaseWorkout {
  phase: string;
  phaseKey: string; // i18n key for phase name
  season: string;
  descriptionKey: string; // i18n key for description
  intensity: 'low' | 'moderate' | 'high';
  recommendedMinutes: number;
  exercises: YogaExercise[];
}

// Yoga exercises database - using i18n keys for translations
const yogaExercises: Record<string, YogaExercise[]> = {
  menstrual: [
    {
      id: 'child-pose',
      nameKey: 'exercises.items.child-pose.name',
      duration: '2-5 min',
      descriptionKey: 'exercises.items.child-pose.description',
      benefitsKey: 'exercises.items.child-pose.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'supine-twist',
      nameKey: 'exercises.items.supine-twist.name',
      duration: '2-3 min per kant',
      descriptionKey: 'exercises.items.supine-twist.description',
      benefitsKey: 'exercises.items.supine-twist.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'legs-up-wall',
      nameKey: 'exercises.items.legs-up-wall.name',
      duration: '5-10 min',
      descriptionKey: 'exercises.items.legs-up-wall.description',
      benefitsKey: 'exercises.items.legs-up-wall.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'cat-cow',
      nameKey: 'exercises.items.cat-cow.name',
      duration: '2-3 min',
      descriptionKey: 'exercises.items.cat-cow.description',
      benefitsKey: 'exercises.items.cat-cow.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
  ],
  follicular: [
    {
      id: 'sun-salutation',
      nameKey: 'exercises.items.sun-salutation.name',
      duration: '5-10 rondes',
      descriptionKey: 'exercises.items.sun-salutation.description',
      benefitsKey: 'exercises.items.sun-salutation.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&h=300&fit=crop',
      difficulty: 'intermediate',
    },
    {
      id: 'warrior-2',
      nameKey: 'exercises.items.warrior-2.name',
      duration: '30-60 sec per kant',
      descriptionKey: 'exercises.items.warrior-2.description',
      benefitsKey: 'exercises.items.warrior-2.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'triangle-pose',
      nameKey: 'exercises.items.triangle-pose.name',
      duration: '30-60 sec per kant',
      descriptionKey: 'exercises.items.triangle-pose.description',
      benefitsKey: 'exercises.items.triangle-pose.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1510894347713-fc3ed6fdf539?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'boat-pose',
      nameKey: 'exercises.items.boat-pose.name',
      duration: '30-60 sec',
      descriptionKey: 'exercises.items.boat-pose.description',
      benefitsKey: 'exercises.items.boat-pose.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop',
      difficulty: 'intermediate',
    },
  ],
  ovulatory: [
    {
      id: 'crow-pose',
      nameKey: 'exercises.items.crow-pose.name',
      duration: '15-30 sec',
      descriptionKey: 'exercises.items.crow-pose.description',
      benefitsKey: 'exercises.items.crow-pose.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
      difficulty: 'advanced',
    },
    {
      id: 'headstand-prep',
      nameKey: 'exercises.items.headstand-prep.name',
      duration: '1-3 min',
      descriptionKey: 'exercises.items.headstand-prep.description',
      benefitsKey: 'exercises.items.headstand-prep.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
      difficulty: 'intermediate',
    },
    {
      id: 'wheel-pose',
      nameKey: 'exercises.items.wheel-pose.name',
      duration: '15-30 sec',
      descriptionKey: 'exercises.items.wheel-pose.description',
      benefitsKey: 'exercises.items.wheel-pose.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400&h=300&fit=crop',
      difficulty: 'advanced',
    },
    {
      id: 'dancer-pose',
      nameKey: 'exercises.items.dancer-pose.name',
      duration: '30 sec per kant',
      descriptionKey: 'exercises.items.dancer-pose.description',
      benefitsKey: 'exercises.items.dancer-pose.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400&h=300&fit=crop',
      difficulty: 'intermediate',
    },
  ],
  luteal: [
    {
      id: 'pigeon-pose',
      nameKey: 'exercises.items.pigeon-pose.name',
      duration: '2-3 min per kant',
      descriptionKey: 'exercises.items.pigeon-pose.description',
      benefitsKey: 'exercises.items.pigeon-pose.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1510894347713-fc3ed6fdf539?w=400&h=300&fit=crop',
      difficulty: 'intermediate',
    },
    {
      id: 'seated-forward-fold',
      nameKey: 'exercises.items.seated-forward-fold.name',
      duration: '2-5 min',
      descriptionKey: 'exercises.items.seated-forward-fold.description',
      benefitsKey: 'exercises.items.seated-forward-fold.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'supported-bridge',
      nameKey: 'exercises.items.supported-bridge.name',
      duration: '3-5 min',
      descriptionKey: 'exercises.items.supported-bridge.description',
      benefitsKey: 'exercises.items.supported-bridge.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'reclined-butterfly',
      nameKey: 'exercises.items.reclined-butterfly.name',
      duration: '3-5 min',
      descriptionKey: 'exercises.items.reclined-butterfly.description',
      benefitsKey: 'exercises.items.reclined-butterfly.benefits',
      imageUrl: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
  ],
};

// Phase workout configurations - using i18n keys
export const phaseWorkouts: PhaseWorkout[] = [
  {
    phase: 'menstrual',
    phaseKey: 'exercises.phases.menstrual',
    season: 'winter',
    descriptionKey: 'exercises.phase_descriptions.menstrual',
    intensity: 'low',
    recommendedMinutes: 15,
    exercises: yogaExercises.menstrual,
  },
  {
    phase: 'follicular',
    phaseKey: 'exercises.phases.follicular',
    season: 'lente',
    descriptionKey: 'exercises.phase_descriptions.follicular',
    intensity: 'moderate',
    recommendedMinutes: 30,
    exercises: yogaExercises.follicular,
  },
  {
    phase: 'ovulatory',
    phaseKey: 'exercises.phases.ovulatory',
    season: 'zomer',
    descriptionKey: 'exercises.phase_descriptions.ovulatory',
    intensity: 'high',
    recommendedMinutes: 45,
    exercises: yogaExercises.ovulatory,
  },
  {
    phase: 'luteal',
    phaseKey: 'exercises.phases.luteal',
    season: 'herfst',
    descriptionKey: 'exercises.phase_descriptions.luteal',
    intensity: 'moderate',
    recommendedMinutes: 25,
    exercises: yogaExercises.luteal,
  },
];

// Get workout for a specific phase/season
export function getWorkoutForPhase(phase: string): PhaseWorkout | undefined {
  return phaseWorkouts.find(w => w.phase === phase);
}

export function getWorkoutForSeason(season: string): PhaseWorkout | undefined {
  return phaseWorkouts.find(w => w.season === season);
}

// Training preferences type (could be stored in DB later)
export interface TrainingPreferences {
  sessionsPerWeek: number;
  minutesPerSession: number;
  preferredDays: string[];
  excludedDays?: string[];
  goals: string[];
}

// Generate personalized weekly schedule based on cycle phase and preferences
export function generateWeeklySchedule(
  currentSeason: string,
  preferences: TrainingPreferences
): { day: string; workout: PhaseWorkout | null; duration: number }[] {
  const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
  const workout = getWorkoutForSeason(currentSeason);
  
  // Distribute sessions across the week
  const sessionsPerWeek = Math.min(preferences.sessionsPerWeek, 7);
  const restDays = 7 - sessionsPerWeek;
  
  // Create schedule with rest days evenly distributed
  const schedule: { day: string; workout: PhaseWorkout | null; duration: number }[] = [];
  let workoutDaysCount = 0;
  
  for (let i = 0; i < 7; i++) {
    const remainingDays = 7 - i;
    const remainingWorkouts = sessionsPerWeek - workoutDaysCount;
    
    // Decide if this should be a workout day
    const shouldWorkout = remainingWorkouts >= remainingDays || 
      (remainingWorkouts > 0 && Math.random() > 0.3);
    
    if (shouldWorkout && workoutDaysCount < sessionsPerWeek) {
      schedule.push({
        day: days[i],
        workout: workout || null,
        duration: preferences.minutesPerSession,
      });
      workoutDaysCount++;
    } else {
      schedule.push({
        day: days[i],
        workout: null,
        duration: 0,
      });
    }
  }
  
  return schedule;
}
