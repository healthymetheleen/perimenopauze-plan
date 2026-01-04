import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  Sparkles, Utensils, Dumbbell, Heart,
  Snowflake, Leaf, Sun, Wind, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLatestPrediction, seasonLabels, seasonColors, useCyclePreferences } from '@/hooks/useCycle';
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

// Beweging tips per seizoen
const seasonMovementTips: Record<string, string> = {
  winter: 'Wandelen, zachte yoga, stretching',
  lente: 'Krachttraining, HIIT, cardio',
  zomer: 'Intensief: hardlopen, groepslessen',
  herfst: 'Pilates, yoga, rustig joggen',
};
// Voeding tips per seizoen (fallback als coach niet beschikbaar)
const seasonFoodTips: Record<string, string> = {
  winter: 'IJzerrijk: spinazie, rode biet, peulvruchten',
  lente: 'Eiwit voor spieropbouw (1.6-2g/kg)',
  zomer: 'Licht maar voedzaam, extra hydratatie',
  herfst: 'Stabiele maaltijdtijden, magnesiumrijk',
  onbekend: 'Gevarieerd en voedzaam eten',
};

export function TodayAtAGlance() {
  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  const { data: scores } = useDailyScores(2);
  const { data: coaching } = useNutritionCoach();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayScore = scores?.find(s => s.day_date === today);
  
  const currentSeason = prediction?.current_season || 'onbekend';
  const colors = seasonColors[currentSeason] || seasonColors.onbekend;
  const workout = currentSeason !== 'onbekend' ? getWorkoutForSeason(currentSeason) : null;
  const foodTip = seasonFoodTips[currentSeason] || seasonFoodTips.onbekend;
  const movementTip = seasonMovementTips[currentSeason] || 'Beweeg op een manier die goed voelt';
  
  // Use AI coaching tips from backend
  const coachingTips = coaching?.tips || [];
  
  // Check if in fertile window
  const isFertile = preferences?.show_fertile_days && 
    prediction?.fertile_window_start && 
    prediction?.fertile_window_end;

  if (!preferences?.onboarding_completed) {
    return null;
  }

  return (
    <Card className={`rounded-2xl overflow-hidden ${colors.bg}`}>
      <CardContent className="p-0">
        {/* Header with season */}
        <div className={`p-4 ${colors.accent} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {seasonIcons[currentSeason]}
              <div>
                <h2 className="text-lg font-bold">{seasonLabels[currentSeason]}</h2>
                <p className="text-sm opacity-90">
                  {format(new Date(), "EEEE d MMMM", { locale: nl })}
                </p>
              </div>
            </div>
            {isFertile && (
              <Badge className="bg-white/20 text-white border-0">
                <Heart className="h-3 w-3 mr-1" />
                Vruchtbaar
              </Badge>
            )}
          </div>
        </div>

        {/* AI Coaching section */}
        {coachingTips.length > 0 && (
          <div className="p-4 border-b border-border/30 bg-white/50 dark:bg-black/20">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
              <span className="text-sm font-semibold text-foreground">Vandaag voor jou</span>
            </div>
            <ul className="space-y-1.5">
              {coachingTips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 divide-x divide-border/30">
          {/* Food section */}
          <Link to="/dagboek" className="p-4 hover:bg-white/30 dark:hover:bg-black/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Eten</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
            {todayScore ? (
              <div className="space-y-1">
                <p className="text-lg font-bold">{Math.round(todayScore.kcal_total || 0)} kcal</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(todayScore.protein_g)}g eiwit • {Math.round(todayScore.fiber_g)}g vezels
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Log je eerste maaltijd →</p>
            )}
            {/* Food tip */}
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
              💡 {foodTip}
            </p>
          </Link>

          {/* Movement section */}
          <Link to="/bewegen" className="p-4 hover:bg-white/30 dark:hover:bg-black/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Bewegen</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
            {workout ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{workout.recommendedMinutes} min aanbevolen</p>
                <Badge variant="secondary" className="text-xs">
                  {workout.exercises[0]?.nameDutch || 'Yoga'}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Bekijk oefeningen →</p>
            )}
            {/* Movement tip */}
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
              💡 {movementTip}
            </p>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}