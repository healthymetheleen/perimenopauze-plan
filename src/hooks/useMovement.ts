import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Yoga exercises by cycle phase
export interface YogaExercise {
  id: string;
  name: string;
  nameDutch: string;
  duration: string;
  description: string;
  benefits: string[];
  imageUrl: string;
  videoUrl?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface PhaseWorkout {
  phase: string;
  phaseDutch: string;
  season: string;
  description: string;
  intensity: 'low' | 'moderate' | 'high';
  recommendedMinutes: number;
  exercises: YogaExercise[];
}

// Yoga exercises database
const yogaExercises: Record<string, YogaExercise[]> = {
  menstrual: [
    {
      id: 'child-pose',
      name: 'Child\'s Pose',
      nameDutch: 'Kindhouding',
      duration: '2-5 min',
      description: 'Kniel op de grond, breng je tenen samen en spreid je knieën. Buig voorover en strek je armen voor je uit of langs je lichaam.',
      benefits: ['Ontspant de onderrug', 'Kalmeert het zenuwstelsel', 'Helpt bij menstruatiepijn'],
      imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'supine-twist',
      name: 'Supine Twist',
      nameDutch: 'Liggende Draai',
      duration: '2-3 min per kant',
      description: 'Lig op je rug, trek één knie naar je borst en laat deze naar de tegenovergestelde kant zakken. Kijk naar de andere kant.',
      benefits: ['Ontspant de onderrug', 'Stimuleert spijsvertering', 'Verlicht spanning'],
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'legs-up-wall',
      name: 'Legs Up the Wall',
      nameDutch: 'Benen tegen de Muur',
      duration: '5-10 min',
      description: 'Lig op je rug met je benen verticaal tegen een muur. Ontspan volledig.',
      benefits: ['Verbetert bloedcirculatie', 'Vermindert zwelling', 'Diep ontspannend'],
      imageUrl: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'cat-cow',
      name: 'Cat-Cow Stretch',
      nameDutch: 'Kat-Koe Stretch',
      duration: '2-3 min',
      description: 'Op handen en knieën, wissel tussen een holle rug (koe) en een bolle rug (kat) op je ademhaling.',
      benefits: ['Maakt de wervelkolom soepel', 'Verlicht rugpijn', 'Kalmerend'],
      imageUrl: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
  ],
  follicular: [
    {
      id: 'sun-salutation',
      name: 'Sun Salutation',
      nameDutch: 'Zonnegroet',
      duration: '5-10 rondes',
      description: 'Een dynamische reeks van poses die het hele lichaam activeert. Begin langzaam en bouw op.',
      benefits: ['Verhoogt energie', 'Versterkt spieren', 'Verbetert flexibiliteit'],
      imageUrl: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&h=300&fit=crop',
      difficulty: 'intermediate',
    },
    {
      id: 'warrior-2',
      name: 'Warrior II',
      nameDutch: 'Krijger II',
      duration: '30-60 sec per kant',
      description: 'Sta met benen wijd, draai één voet 90 graden en buig die knie. Strek je armen naar de zijkanten.',
      benefits: ['Versterkt benen', 'Opent heupen', 'Bouwt focus'],
      imageUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'triangle-pose',
      name: 'Triangle Pose',
      nameDutch: 'Driehoek',
      duration: '30-60 sec per kant',
      description: 'Vanuit brede stand, buig zijwaarts naar één voet terwijl je armen een verticale lijn vormen.',
      benefits: ['Stretcht zijkant', 'Versterkt benen', 'Verbetert balans'],
      imageUrl: 'https://images.unsplash.com/photo-1510894347713-fc3ed6fdf539?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'boat-pose',
      name: 'Boat Pose',
      nameDutch: 'Boothouding',
      duration: '30-60 sec',
      description: 'Zit met gebogen knieën, til je voeten van de grond en balanceer op je zitbotten met gestrekte armen.',
      benefits: ['Versterkt core', 'Verbetert balans', 'Stimuleert spijsvertering'],
      imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop',
      difficulty: 'intermediate',
    },
  ],
  ovulatory: [
    {
      id: 'crow-pose',
      name: 'Crow Pose',
      nameDutch: 'Kraaihouding',
      duration: '15-30 sec',
      description: 'Balanceer op je handen met je knieën rustend op je bovenarm. Een uitdagende armbalans.',
      benefits: ['Bouwt kracht', 'Verbetert focus', 'Verhoogt zelfvertrouwen'],
      imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
      difficulty: 'advanced',
    },
    {
      id: 'headstand-prep',
      name: 'Headstand Prep',
      nameDutch: 'Hoofdstand Voorbereiding',
      duration: '1-3 min',
      description: 'Dolfijnhouding met voorhoofd op de grond. Bouw kracht op voor hoofdstand.',
      benefits: ['Versterkt schouders', 'Verbetert bloedcirculatie', 'Energizerend'],
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
      difficulty: 'intermediate',
    },
    {
      id: 'wheel-pose',
      name: 'Wheel Pose',
      nameDutch: 'Wielhouding',
      duration: '15-30 sec',
      description: 'Diepe achterwaartse buiging met handen en voeten op de grond, lichaam omhoog.',
      benefits: ['Opent borst en schouders', 'Energizerend', 'Versterkt rug'],
      imageUrl: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400&h=300&fit=crop',
      difficulty: 'advanced',
    },
    {
      id: 'dancer-pose',
      name: 'Dancer\'s Pose',
      nameDutch: 'Dansershouding',
      duration: '30 sec per kant',
      description: 'Sta op één been, pak de andere enkel vast en strek naar achteren terwijl je voorover buigt.',
      benefits: ['Verbetert balans', 'Opent schouders', 'Versterkt benen'],
      imageUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400&h=300&fit=crop',
      difficulty: 'intermediate',
    },
  ],
  luteal: [
    {
      id: 'pigeon-pose',
      name: 'Pigeon Pose',
      nameDutch: 'Duifhouding',
      duration: '2-3 min per kant',
      description: 'Vanuit plank, breng één knie naar voren en strek het andere been naar achteren. Buig voorover.',
      benefits: ['Opent heupen', 'Verlicht spanning', 'Emotioneel bevrijdend'],
      imageUrl: 'https://images.unsplash.com/photo-1510894347713-fc3ed6fdf539?w=400&h=300&fit=crop',
      difficulty: 'intermediate',
    },
    {
      id: 'seated-forward-fold',
      name: 'Seated Forward Fold',
      nameDutch: 'Zittende Vooroverbuiging',
      duration: '2-5 min',
      description: 'Zit met gestrekte benen en buig vanuit je heupen voorover naar je voeten.',
      benefits: ['Kalmeert zenuwstelsel', 'Stretcht hamstrings', 'Verlicht stress'],
      imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'supported-bridge',
      name: 'Supported Bridge',
      nameDutch: 'Ondersteunde Brug',
      duration: '3-5 min',
      description: 'Lig op je rug, voeten plat op de grond, til je heupen en plaats een blok eronder.',
      benefits: ['Opent borst', 'Ontspant onderrug', 'Kalmerend'],
      imageUrl: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
    {
      id: 'reclined-butterfly',
      name: 'Reclined Butterfly',
      nameDutch: 'Liggende Vlinder',
      duration: '3-5 min',
      description: 'Lig op je rug, breng je voetzolen samen en laat je knieën naar de zijkanten zakken.',
      benefits: ['Opent heupen', 'Verlicht menstruele klachten', 'Diep ontspannend'],
      imageUrl: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&h=300&fit=crop',
      difficulty: 'beginner',
    },
  ],
};

// Phase workout configurations
export const phaseWorkouts: PhaseWorkout[] = [
  {
    phase: 'menstrual',
    phaseDutch: 'Menstruatie',
    season: 'winter',
    description: 'Rust en herstel staan centraal. Zachte, herstellende oefeningen die je helpen ontspannen.',
    intensity: 'low',
    recommendedMinutes: 15,
    exercises: yogaExercises.menstrual,
  },
  {
    phase: 'follicular',
    phaseDutch: 'Folliculaire fase',
    season: 'lente',
    description: 'Je energie groeit! Tijd voor dynamische oefeningen die kracht en flexibiliteit opbouwen.',
    intensity: 'moderate',
    recommendedMinutes: 30,
    exercises: yogaExercises.follicular,
  },
  {
    phase: 'ovulatory',
    phaseDutch: 'Ovulatie',
    season: 'zomer',
    description: 'Piek van energie en kracht. Uitdagende oefeningen die je grenzen verleggen.',
    intensity: 'high',
    recommendedMinutes: 45,
    exercises: yogaExercises.ovulatory,
  },
  {
    phase: 'luteal',
    phaseDutch: 'Luteale fase',
    season: 'herfst',
    description: 'Tijd om te vertragen. Focus op stretching, ademhaling en stressverlichting.',
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
