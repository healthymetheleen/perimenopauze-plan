import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Dumbbell, Play, Clock, Flame, ChevronRight, 
  Calendar, Settings, Snowflake, Leaf, Sun, Wind,
  Check, Target, Heart, Sparkles
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useLatestPrediction, useCyclePreferences, seasonLabels, seasonColors } from '@/hooks/useCycle';
import { 
  phaseWorkouts, 
  getWorkoutForSeason, 
  type PhaseWorkout,
  type YogaExercise,
  type TrainingPreferences
} from '@/hooks/useMovement';

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-5 w-5" />,
  lente: <Leaf className="h-5 w-5" />,
  zomer: <Sun className="h-5 w-5" />,
  herfst: <Wind className="h-5 w-5" />,
};

const intensityColors = {
  low: 'bg-success/20 text-success-foreground',
  moderate: 'bg-warning/20 text-warning-foreground',
  high: 'bg-destructive/20 text-destructive-foreground',
};

const intensityLabels = {
  low: 'Rustig',
  moderate: 'Gemiddeld',
  high: 'Intensief',
};

const allDays = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

// Generate personalized weekly schedule with excluded days
function generatePersonalizedSchedule(
  currentSeason: string,
  preferences: TrainingPreferences
): { day: string; workout: PhaseWorkout | null; duration: number; exercises: YogaExercise[] }[] {
  const workout = getWorkoutForSeason(currentSeason);
  const availableDays = allDays.filter(day => !preferences.excludedDays?.includes(day));
  
  // Distribute sessions across available days
  const sessionsPerWeek = Math.min(preferences.sessionsPerWeek, availableDays.length);
  
  // Pick the best days (spread evenly)
  const workoutDays: string[] = [];
  if (availableDays.length > 0 && sessionsPerWeek > 0) {
    const step = Math.floor(availableDays.length / sessionsPerWeek);
    for (let i = 0; i < sessionsPerWeek; i++) {
      const dayIndex = (i * step) % availableDays.length;
      workoutDays.push(availableDays[dayIndex]);
    }
  }

  return allDays.map(day => {
    const isWorkoutDay = workoutDays.includes(day);
    const isExcluded = preferences.excludedDays?.includes(day);
    
    // Select specific exercises for this day based on workout and day of week
    const dayExercises: YogaExercise[] = [];
    if (isWorkoutDay && workout) {
      // Rotate through exercises based on day index
      const dayIndex = allDays.indexOf(day);
      const exerciseCount = Math.min(3, workout.exercises.length);
      for (let i = 0; i < exerciseCount; i++) {
        const exerciseIndex = (dayIndex + i) % workout.exercises.length;
        dayExercises.push(workout.exercises[exerciseIndex]);
      }
    }

    return {
      day,
      workout: isWorkoutDay ? workout || null : null,
      duration: isWorkoutDay ? preferences.minutesPerSession : 0,
      exercises: dayExercises,
      isExcluded,
    };
  });
}

export default function MovementPage() {
  const { data: prediction } = useLatestPrediction();
  const { data: cyclePrefs } = useCyclePreferences();
  
  const [trainingPrefs, setTrainingPrefs] = useState<TrainingPreferences>({
    sessionsPerWeek: 3,
    minutesPerSession: 30,
    preferredDays: [],
    excludedDays: ['Zondag'],
    goals: ['flexibiliteit', 'ontspanning'],
  });
  
  const [selectedExercise, setSelectedExercise] = useState<YogaExercise | null>(null);
  const [prefsDialogOpen, setPrefsDialogOpen] = useState(false);

  const currentSeason = prediction?.current_season || 'onbekend';
  const colors = seasonColors[currentSeason] || seasonColors.onbekend;
  const currentWorkout = getWorkoutForSeason(currentSeason);
  const weeklySchedule = generatePersonalizedSchedule(currentSeason, trainingPrefs);
  
  const workoutDays = weeklySchedule.filter(d => d.workout).length;
  const totalMinutes = workoutDays * trainingPrefs.minutesPerSession;

  const toggleExcludedDay = (day: string) => {
    setTrainingPrefs(prev => ({
      ...prev,
      excludedDays: prev.excludedDays?.includes(day)
        ? prev.excludedDays.filter(d => d !== day)
        : [...(prev.excludedDays || []), day]
    }));
  };

  return (
    <AppLayout>
      <div className="space-y-6 bg-gradient-subtle min-h-screen -m-4 p-4 sm:-m-6 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gradient">Bewegen</h1>
            <p className="text-muted-foreground">
              Yoga & beweging afgestemd op je cyclus
            </p>
          </div>
          <Dialog open={prefsDialogOpen} onOpenChange={setPrefsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="glass">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Trainingsvoorkeuren</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <Label>Trainingsdagen per week: {trainingPrefs.sessionsPerWeek}</Label>
                  <Slider
                    value={[trainingPrefs.sessionsPerWeek]}
                    onValueChange={([v]) => setTrainingPrefs(p => ({ ...p, sessionsPerWeek: v }))}
                    min={1}
                    max={7}
                    step={1}
                  />
                </div>
                <div className="space-y-3">
                  <Label>Minuten per sessie: {trainingPrefs.minutesPerSession}</Label>
                  <Slider
                    value={[trainingPrefs.minutesPerSession]}
                    onValueChange={([v]) => setTrainingPrefs(p => ({ ...p, minutesPerSession: v }))}
                    min={10}
                    max={60}
                    step={5}
                  />
                </div>
                
                {/* Day exclusion */}
                <div className="space-y-3">
                  <Label>Dagen uitsluiten (nooit trainen)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {allDays.map(day => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`exclude-${day}`}
                          checked={trainingPrefs.excludedDays?.includes(day) ?? false}
                          onCheckedChange={() => toggleExcludedDay(day)}
                        />
                        <label 
                          htmlFor={`exclude-${day}`} 
                          className="text-sm cursor-pointer"
                        >
                          {day}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uitgesloten dagen worden overgeslagen in je weekschema.
                  </p>
                </div>
                
                <Button onClick={() => setPrefsDialogOpen(false)} className="w-full btn-gradient">
                  Opslaan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Current Phase Summary */}
        {currentWorkout && (
          <Card className={`glass-strong rounded-2xl overflow-hidden ${colors.bg}`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${colors.accent} text-white`}>
                  {seasonIcons[currentSeason]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className={`text-white ${colors.accent}`}>
                      {seasonLabels[currentSeason]}
                    </Badge>
                    <Badge className={intensityColors[currentWorkout.intensity]}>
                      {intensityLabels[currentWorkout.intensity]}
                    </Badge>
                  </div>
                  <h2 className={`font-semibold text-lg ${colors.text}`}>{currentWorkout.phaseDutch}</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {currentWorkout.description}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{currentWorkout.recommendedMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>{currentWorkout.exercises.length} oefeningen</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Schedule with specific exercises */}
        <Card className="glass rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Jouw weekschema
            </CardTitle>
            <CardDescription>
              Aangepast aan je cyclusfase: {seasonLabels[currentSeason]}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {weeklySchedule.map((day) => (
              <div 
                key={day.day}
                className={`p-3 rounded-xl ${
                  day.workout 
                    ? 'bg-primary/10 border border-primary/20' 
                    : trainingPrefs.excludedDays?.includes(day.day)
                    ? 'bg-muted/30 opacity-50'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{day.day}</span>
                  {day.workout ? (
                    <Badge className="bg-primary/20 text-primary">
                      <Clock className="h-3 w-3 mr-1" />
                      {day.duration} min
                    </Badge>
                  ) : trainingPrefs.excludedDays?.includes(day.day) ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      Uitgesloten
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Heart className="h-3 w-3 mr-1" />
                      Rustdag
                    </Badge>
                  )}
                </div>
                
                {day.exercises && day.exercises.length > 0 && (
                  <div className="space-y-2">
                    {day.exercises.map(exercise => (
                      <div 
                        key={exercise.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setSelectedExercise(exercise)}
                      >
                        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={exercise.imageUrl} 
                            alt={exercise.nameDutch}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span>{exercise.nameDutch}</span>
                        <span className="text-muted-foreground text-xs ml-auto">{exercise.duration}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
              <span>{workoutDays}x per week</span>
              <span>Totaal: {totalMinutes} min</span>
            </div>
          </CardContent>
        </Card>

        {/* Phase Tabs with Exercises */}
        <Tabs defaultValue={currentSeason} className="space-y-4">
          <TabsList className="w-full glass">
            {phaseWorkouts.map(w => (
              <TabsTrigger 
                key={w.season} 
                value={w.season}
                className="flex-1 data-[state=active]:bg-primary/20"
              >
                {seasonIcons[w.season]}
              </TabsTrigger>
            ))}
          </TabsList>

          {phaseWorkouts.map(workout => (
            <TabsContent key={workout.season} value={workout.season} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{workout.phaseDutch}</h3>
                  <p className="text-sm text-muted-foreground">{seasonLabels[workout.season]}</p>
                </div>
                <Badge className={intensityColors[workout.intensity]}>
                  {intensityLabels[workout.intensity]}
                </Badge>
              </div>

              <div className="grid gap-4">
                {workout.exercises.map(exercise => (
                  <Card 
                    key={exercise.id} 
                    className="glass rounded-xl overflow-hidden cursor-pointer hover:shadow-soft transition-all"
                    onClick={() => setSelectedExercise(exercise)}
                  >
                    <div className="flex">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
                        <img 
                          src={exercise.imageUrl} 
                          alt={exercise.nameDutch}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="flex-1 p-3 sm:p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-sm sm:text-base">{exercise.nameDutch}</h4>
                            <p className="text-xs text-muted-foreground">{exercise.name}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {exercise.duration}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {exercise.difficulty}
                          </Badge>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Exercise Detail Dialog */}
        <Dialog open={!!selectedExercise} onOpenChange={() => setSelectedExercise(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            {selectedExercise && (
              <>
                <div className="aspect-video w-full overflow-hidden rounded-lg -mt-2 mb-4">
                  <img 
                    src={selectedExercise.imageUrl} 
                    alt={selectedExercise.nameDutch}
                    className="w-full h-full object-cover"
                  />
                </div>
                <DialogHeader>
                  <DialogTitle className="text-xl">{selectedExercise.nameDutch}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{selectedExercise.name}</p>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {selectedExercise.duration}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {selectedExercise.difficulty}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Uitvoering</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedExercise.description}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Voordelen</h4>
                    <ul className="space-y-1">
                      {selectedExercise.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-success" />
                          <span className="text-muted-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    className="w-full btn-gradient" 
                    onClick={() => setSelectedExercise(null)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start oefening
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
