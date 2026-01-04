import { format, isWithinInterval, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  Sparkles, Utensils, Dumbbell, Heart, AlertCircle,
  Snowflake, Leaf, Sun, Wind, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLatestPrediction, seasonLabels, useCyclePreferences, phaseLabels } from '@/hooks/useCycle';
import { useDailyScores } from '@/hooks/useDiary';
import { useNutritionCoach } from '@/hooks/useNutritionCoach';
import { getWorkoutForSeason } from '@/hooks/useMovement';

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-5 w-5" />,
  lente: <Leaf className="h-5 w-5" />,
  zomer: <Sun className="h-5 w-5" />,
  herfst: <Wind className="h-5 w-5" />,
  onbekend: <Sparkles className="h-5 w-5" />,
};

// Subtiele gradient achtergronden per seizoen
const seasonGradients: Record<string, string> = {
  winter: 'bg-gradient-to-br from-blue-100/80 via-slate-50 to-blue-50/60 dark:from-blue-950/50 dark:via-slate-900/40 dark:to-blue-900/30',
  lente: 'bg-gradient-to-br from-green-100/80 via-emerald-50/60 to-teal-50/50 dark:from-green-950/50 dark:via-emerald-900/40 dark:to-teal-900/30',
  zomer: 'bg-gradient-to-br from-amber-100/80 via-yellow-50/60 to-orange-50/50 dark:from-amber-950/50 dark:via-yellow-900/40 dark:to-orange-900/30',
  herfst: 'bg-gradient-to-br from-orange-100/80 via-amber-50/60 to-rose-50/50 dark:from-orange-950/50 dark:via-amber-900/40 dark:to-rose-900/30',
  onbekend: 'bg-gradient-to-br from-gray-100/80 via-slate-50 to-gray-50/60 dark:from-gray-950/50 dark:via-slate-900/40 dark:to-gray-900/30',
};

// Subtiele header kleuren
const seasonHeaderColors: Record<string, string> = {
  winter: 'bg-gradient-to-r from-blue-500/90 to-blue-600/90',
  lente: 'bg-gradient-to-r from-green-500/90 to-emerald-600/90',
  zomer: 'bg-gradient-to-r from-amber-500/90 to-orange-500/90',
  herfst: 'bg-gradient-to-r from-orange-500/90 to-rose-500/90',
  onbekend: 'bg-gradient-to-r from-gray-500/90 to-slate-600/90',
};

// Tekst kleuren per seizoen
const seasonTextColors: Record<string, string> = {
  winter: 'text-blue-700 dark:text-blue-300',
  lente: 'text-green-700 dark:text-green-300',
  zomer: 'text-amber-700 dark:text-amber-300',
  herfst: 'text-orange-700 dark:text-orange-300',
  onbekend: 'text-gray-700 dark:text-gray-300',
};

// Beweging tips per seizoen
const seasonMovementTips: Record<string, string> = {
  winter: 'Wandelen, zachte yoga, stretching',
  lente: 'Krachttraining, HIIT, cardio',
  zomer: 'Intensief: hardlopen, groepslessen',
  herfst: 'Pilates, yoga, rustig joggen',
};

// Voeding tips per seizoen
const seasonFoodTips: Record<string, string> = {
  winter: 'IJzerrijk: spinazie, rode biet, peulvruchten',
  lente: 'Eiwit voor spieropbouw (1.6-2g/kg)',
  zomer: 'Licht maar voedzaam, extra hydratatie',
  herfst: 'Stabiele maaltijdtijden, magnesiumrijk',
  onbekend: 'Gevarieerd en voedzaam eten',
};

// Mogelijke klachten per seizoen
const seasonSymptoms: Record<string, string[]> = {
  winter: ['Vermoeidheid', 'Krampen', 'Lage energie'],
  lente: ['Stijgende energie', 'Betere focus'],
  zomer: ['Piek energie', 'Soms overstimulatie'],
  herfst: ['PMS', 'Stemmingswisselingen', 'Cravings'],
  onbekend: [],
};

export function TodayAtAGlance() {
  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  const { data: scores } = useDailyScores(2);
  const { data: coaching } = useNutritionCoach();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayScore = scores?.find(s => s.day_date === today);
  
  const currentSeason = prediction?.current_season || 'onbekend';
  const currentPhase = prediction?.current_phase || 'onbekend';
  const workout = currentSeason !== 'onbekend' ? getWorkoutForSeason(currentSeason) : null;
  const foodTip = seasonFoodTips[currentSeason] || seasonFoodTips.onbekend;
  const movementTip = seasonMovementTips[currentSeason] || 'Beweeg op een manier die goed voelt';
  const symptoms = seasonSymptoms[currentSeason] || [];
  
  // Use AI coaching tips from backend
  const coachingTips = coaching?.tips?.slice(0, 3) || [];
  
  // Check if ACTUALLY in fertile window (date check + user wants to see it)
  const isFertileToday = preferences?.show_fertile_days && 
    prediction?.fertile_window_start && 
    prediction?.fertile_window_end &&
    isWithinInterval(new Date(), {
      start: parseISO(prediction.fertile_window_start),
      end: parseISO(prediction.fertile_window_end),
    });

  if (!preferences?.onboarding_completed) {
    return null;
  }

  return (
    <Card className={`rounded-2xl overflow-hidden border-0 shadow-soft ${seasonGradients[currentSeason]}`}>
      <CardContent className="p-0">
        {/* Header with season - subtle gradient */}
        <div className={`p-4 ${seasonHeaderColors[currentSeason]} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-white/20">
                {seasonIcons[currentSeason]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{seasonLabels[currentSeason]}</h2>
                  {isFertileToday && (
                    <Badge className="bg-white/25 text-white border-0 text-xs">
                      <Heart className="h-3 w-3 mr-1" />
                      Vruchtbaar
                    </Badge>
                  )}
                </div>
                <p className="text-sm opacity-90">
                  {format(new Date(), "EEEE d MMMM", { locale: nl })} · {phaseLabels[currentPhase]}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Expected symptoms for this phase */}
        {symptoms.length > 0 && (
          <div className="px-4 py-2 bg-white/40 dark:bg-black/10 border-b border-border/20">
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className={`h-3 w-3 ${seasonTextColors[currentSeason]}`} />
              <span className="text-muted-foreground">Mogelijk:</span>
              <span className={seasonTextColors[currentSeason]}>{symptoms.join(' · ')}</span>
            </div>
          </div>
        )}

        {/* AI Coaching section */}
        {coachingTips.length > 0 && (
          <div className="p-4 border-b border-border/20 bg-white/30 dark:bg-black/10">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
              <span className="text-sm font-semibold text-foreground">Persoonlijk advies</span>
            </div>
            <ul className="space-y-1">
              {coachingTips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className={seasonTextColors[currentSeason]}>•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 divide-x divide-border/20">
          {/* Food section */}
          <Link to="/dagboek" className="p-4 hover:bg-white/40 dark:hover:bg-black/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className={`h-4 w-4 ${seasonTextColors[currentSeason]}`} />
              <span className="text-sm font-semibold">Eten vandaag</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
            {todayScore && todayScore.meals_count > 0 ? (
              <div className="space-y-1">
                <p className="text-xl font-bold">{Math.round(todayScore.kcal_total || 0)} kcal</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(todayScore.protein_g || 0)}g eiwit · {Math.round(todayScore.fiber_g || 0)}g vezels
                </p>
                <p className="text-xs text-muted-foreground">
                  {todayScore.meals_count} maaltijd{todayScore.meals_count !== 1 ? 'en' : ''} gelogd
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Log je eerste maaltijd →</p>
            )}
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/20">
              💡 {foodTip}
            </p>
          </Link>

          {/* Movement section */}
          <Link to="/bewegen" className="p-4 hover:bg-white/40 dark:hover:bg-black/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className={`h-4 w-4 ${seasonTextColors[currentSeason]}`} />
              <span className="text-sm font-semibold">Bewegen</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
            {workout ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{workout.recommendedMinutes} min</p>
                <Badge variant="secondary" className="text-xs">
                  {workout.exercises[0]?.nameDutch || 'Yoga'}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Bekijk oefeningen →</p>
            )}
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/20">
              💡 {movementTip}
            </p>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}