import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useLatestPrediction, useCyclePreferences, seasonColors } from '@/hooks/useCycle';
import { 
  usePhaseWorkouts,
  getWorkoutForSeasonFromWorkouts,
  type PhaseWorkout,
  type DbExercise,
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

const difficultyLabels = {
  beginner: { nl: 'Beginner', en: 'Beginner' },
  intermediate: { nl: 'Gemiddeld', en: 'Intermediate' },
  advanced: { nl: 'Gevorderd', en: 'Advanced' },
};

// Day keys for translation - these are internal keys used for storage
const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export default function MovementPage() {
  const { t, i18n } = useTranslation();
  const { data: prediction } = useLatestPrediction();
  const { data: cyclePrefs } = useCyclePreferences();
  const { phaseWorkouts, isLoading: exercisesLoading } = usePhaseWorkouts();
  
  // Translated labels
  const seasonLabelsTranslated = useMemo(() => ({
    winter: t('seasons.winter'),
    lente: t('seasons.lente'),
    zomer: t('seasons.zomer'),
    herfst: t('seasons.herfst'),
    onbekend: t('seasons.onbekend'),
  }), [t]);
  
  const intensityLabelsTranslated = useMemo(() => ({
    low: i18n.language === 'nl' ? 'Rustig' : 'Easy',
    moderate: i18n.language === 'nl' ? 'Gemiddeld' : 'Moderate',
    high: i18n.language === 'nl' ? 'Intensief' : 'Intensive',
  }), [i18n.language]);
  
  // Translated day names
  const dayLabels = useMemo(() => dayKeys.map(key => t(`movement.${key}`)), [t]);
  
  const [trainingPrefs, setTrainingPrefs] = useState<TrainingPreferences>({
    sessionsPerWeek: 3,
    minutesPerSession: 30,
    preferredDays: [],
    excludedDays: ['sunday'], // Use keys instead of translated names
    goals: ['flexibiliteit', 'ontspanning'],
  });
  
  const [selectedExercise, setSelectedExercise] = useState<DbExercise | null>(null);
  const [prefsDialogOpen, setPrefsDialogOpen] = useState(false);

  const currentSeason = prediction?.current_season || 'onbekend';
  const colors = seasonColors[currentSeason] || seasonColors.onbekend;
  const currentWorkout = getWorkoutForSeasonFromWorkouts(phaseWorkouts, currentSeason);
  
  // Get exercise name based on language
  const getExerciseName = (exercise: DbExercise) => 
    i18n.language === 'nl' ? exercise.name_dutch : exercise.name;
  
  // Get difficulty label based on language
  const getDifficultyLabel = (difficulty: DbExercise['difficulty']) =>
    i18n.language === 'nl' ? difficultyLabels[difficulty].nl : difficultyLabels[difficulty].en;
  
  // Generate personalized weekly schedule
  const weeklySchedule = useMemo(() => {
    const workout = getWorkoutForSeasonFromWorkouts(phaseWorkouts, currentSeason);
    const availableDayKeys = dayKeys.filter(key => !trainingPrefs.excludedDays?.includes(key));
    
    const sessionsPerWeek = Math.min(trainingPrefs.sessionsPerWeek, availableDayKeys.length);
    
    const workoutDayKeys: string[] = [];
    if (availableDayKeys.length > 0 && sessionsPerWeek > 0) {
      const step = Math.floor(availableDayKeys.length / sessionsPerWeek);
      for (let i = 0; i < sessionsPerWeek; i++) {
        const dayIndex = (i * step) % availableDayKeys.length;
        workoutDayKeys.push(availableDayKeys[dayIndex]);
      }
    }

    return dayKeys.map((key, index) => {
      const isWorkoutDay = workoutDayKeys.includes(key);
      const isExcluded = trainingPrefs.excludedDays?.includes(key);
      
      const dayExercises: DbExercise[] = [];
      if (isWorkoutDay && workout && workout.exercises.length > 0) {
        const exerciseCount = Math.min(3, workout.exercises.length);
        for (let i = 0; i < exerciseCount; i++) {
          const exerciseIndex = (index + i) % workout.exercises.length;
          dayExercises.push(workout.exercises[exerciseIndex]);
        }
      }

      return {
        key,
        label: dayLabels[index],
        workout: isWorkoutDay ? workout || null : null,
        duration: isWorkoutDay ? trainingPrefs.minutesPerSession : 0,
        exercises: dayExercises,
        isExcluded,
      };
    });
  }, [currentSeason, trainingPrefs, dayLabels, phaseWorkouts]);
  
  const workoutDays = weeklySchedule.filter(d => d.workout).length;
  const totalMinutes = workoutDays * trainingPrefs.minutesPerSession;

  const toggleExcludedDay = (key: string) => {
    setTrainingPrefs(prev => ({
      ...prev,
      excludedDays: prev.excludedDays?.includes(key)
        ? prev.excludedDays.filter(d => d !== key)
        : [...(prev.excludedDays || []), key]
    }));
  };

  // Parse markdown-style description for display
  const parseDescription = (description: string | null) => {
    if (!description) return { intro: '', steps: [] as string[] };
    
    const parts = description.split('**Uitvoering:**');
    const intro = parts[0]?.trim() || '';
    const stepsText = parts[1] || '';
    const steps = stepsText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.match(/^\d+\./))
      .map(s => s.replace(/^\d+\.\s*/, ''));
    
    return { intro, steps };
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gradient">{t('movement.title')}</h1>
            <p className="text-muted-foreground">
              {t('movement.subtitle')}
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
                <DialogTitle>{t('movement.trainingPreferences')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <Label>{t('movement.daysPerWeek')}: {trainingPrefs.sessionsPerWeek}</Label>
                  <Slider
                    value={[trainingPrefs.sessionsPerWeek]}
                    onValueChange={([v]) => setTrainingPrefs(p => ({ ...p, sessionsPerWeek: v }))}
                    min={1}
                    max={7}
                    step={1}
                  />
                </div>
                <div className="space-y-3">
                  <Label>{t('movement.minutesPerSession')}: {trainingPrefs.minutesPerSession}</Label>
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
                  <Label>{t('movement.excludeDays')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {dayKeys.map((key, index) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`exclude-${key}`}
                          checked={trainingPrefs.excludedDays?.includes(key) ?? false}
                          onCheckedChange={() => toggleExcludedDay(key)}
                        />
                        <label 
                          htmlFor={`exclude-${key}`} 
                          className="text-sm cursor-pointer"
                        >
                          {dayLabels[index]}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('movement.excludedDaysNote')}
                  </p>
                </div>
                
                <Button onClick={() => setPrefsDialogOpen(false)} className="w-full btn-gradient">
                  {t('movement.save')}
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
                      {seasonLabelsTranslated[currentSeason as keyof typeof seasonLabelsTranslated]}
                    </Badge>
                    <Badge className={intensityColors[currentWorkout.intensity]}>
                      {intensityLabelsTranslated[currentWorkout.intensity]}
                    </Badge>
                  </div>
                  <h2 className={`font-semibold text-lg ${colors.text}`}>{t(currentWorkout.phaseKey)}</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t(currentWorkout.descriptionKey)}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{currentWorkout.recommendedMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>{currentWorkout.exercises.length} {t('movement.exercises')}</span>
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
              {t('movement.yourSchedule')}
            </CardTitle>
            <CardDescription>
              {t('movement.adjustedToPhase')}: {seasonLabelsTranslated[currentSeason as keyof typeof seasonLabelsTranslated]}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {exercisesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <>
                {weeklySchedule.map((day) => (
                  <div 
                    key={day.key}
                    className={`p-3 rounded-xl ${
                      day.workout 
                        ? 'bg-primary/10 border border-primary/20' 
                        : day.isExcluded
                        ? 'bg-muted/30 opacity-50'
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{day.label}</span>
                      {day.workout ? (
                        <Badge className="bg-primary/20 text-primary">
                          <Clock className="h-3 w-3 mr-1" />
                          {day.duration} min
                        </Badge>
                      ) : day.isExcluded ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          {t('movement.excluded')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Heart className="h-3 w-3 mr-1" />
                          {t('movement.restDay')}
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
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-muted">
                              {exercise.image_url && (
                                <img 
                                  src={exercise.image_url} 
                                  alt={getExerciseName(exercise)}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <span>{getExerciseName(exercise)}</span>
                            <span className="text-muted-foreground text-xs ml-auto">{exercise.duration}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
                  <span>{workoutDays}x {t('movement.perWeek')}</span>
                  <span>{t('movement.total')}: {totalMinutes} min</span>
                </div>
              </>
            )}
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
                  <h3 className="font-semibold">{t(workout.phaseKey)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {seasonLabelsTranslated[workout.season as keyof typeof seasonLabelsTranslated]}
                  </p>
                </div>
                <Badge className={intensityColors[workout.intensity]}>
                  {intensityLabelsTranslated[workout.intensity]}
                </Badge>
              </div>

              {exercisesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : workout.exercises.length === 0 ? (
                <Card className="glass rounded-xl">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {t('movement.noExercises')}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {workout.exercises.map(exercise => (
                    <Card 
                      key={exercise.id} 
                      className="glass rounded-xl overflow-hidden cursor-pointer hover:shadow-soft transition-all"
                      onClick={() => setSelectedExercise(exercise)}
                    >
                      <div className="flex flex-col sm:flex-row">
                        <div className="w-full sm:w-32 h-32 sm:h-32 flex-shrink-0 bg-muted">
                          {exercise.image_url && (
                            <img 
                              src={exercise.image_url} 
                              alt={getExerciseName(exercise)}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <CardContent className="flex-1 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-base">{getExerciseName(exercise)}</h4>
                              {exercise.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {exercise.description.split('**Uitvoering:**')[0].trim()}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {exercise.duration}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {getDifficultyLabel(exercise.difficulty)}
                            </Badge>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Exercise Detail Dialog */}
        <Dialog open={!!selectedExercise} onOpenChange={() => setSelectedExercise(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            {selectedExercise && (
              <>
                {selectedExercise.image_url && (
                  <div className="aspect-video w-full overflow-hidden rounded-lg -mt-2 mb-4">
                    <img 
                      src={selectedExercise.image_url} 
                      alt={getExerciseName(selectedExercise)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <DialogHeader>
                  <DialogTitle className="text-xl">{getExerciseName(selectedExercise)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {selectedExercise.duration}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {getDifficultyLabel(selectedExercise.difficulty)}
                    </Badge>
                  </div>
                  
                  {selectedExercise.description && (
                    <div>
                      <h4 className="font-medium mb-2">{t('movement.execution')}</h4>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <p>{parseDescription(selectedExercise.description).intro}</p>
                        {parseDescription(selectedExercise.description).steps.length > 0 && (
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            {parseDescription(selectedExercise.description).steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedExercise.benefits && selectedExercise.benefits.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">{t('movement.benefits')}</h4>
                      <ul className="space-y-1">
                        {selectedExercise.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-success" />
                            <span className="text-muted-foreground">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    className="w-full btn-gradient" 
                    onClick={() => setSelectedExercise(null)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {t('movement.startExercise')}
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
