import { format, isWithinInterval, parseISO, startOfDay, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  Sparkles, Utensils, Dumbbell, Heart, AlertCircle,
  Snowflake, Leaf, Sun, Wind, ChevronRight, Check, X, Pill
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLatestPrediction, seasonLabels, useCyclePreferences, useCycles, phaseLabels, getSeasonForDate } from '@/hooks/useCycle';
import { useDailyScores } from '@/hooks/useDiary';
import { useNutritionCoach } from '@/hooks/useNutritionCoach';
import { useDailyAnalysis } from '@/hooks/useDailyAnalysis';
import { getWorkoutForSeason } from '@/hooks/useMovement';

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-5 w-5" />,
  lente: <Leaf className="h-5 w-5" />,
  zomer: <Sun className="h-5 w-5" />,
  herfst: <Wind className="h-5 w-5" />,
  onbekend: <Sparkles className="h-5 w-5" />,
};

// Subtiele gradient achtergronden per seizoen (via design tokens in index.css)
const seasonGradients: Record<string, string> = {
  winter: 'season-surface-winter',
  lente: 'season-surface-lente',
  zomer: 'season-surface-zomer',
  herfst: 'season-surface-herfst',
  onbekend: 'season-surface-onbekend',
};

// Subtiele header kleuren (via design tokens in index.css)
const seasonHeaderColors: Record<string, string> = {
  winter: 'season-header-winter',
  lente: 'season-header-lente',
  zomer: 'season-header-zomer',
  herfst: 'season-header-herfst',
  onbekend: 'season-header-onbekend',
};

// Tekst kleuren per seizoen (via design tokens in index.css)
const seasonTextColors: Record<string, string> = {
  winter: 'season-text-winter',
  lente: 'season-text-lente',
  zomer: 'season-text-zomer',
  herfst: 'season-text-herfst',
  onbekend: 'season-text-onbekend',
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
  const { data: cycles } = useCycles(1);
  const { data: scores } = useDailyScores(2);
  const { data: coaching } = useNutritionCoach();
  const { data: dailyAnalysis } = useDailyAnalysis();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDate = startOfDay(new Date());
  const todayScore = scores?.find(s => s.day_date === today);
  
  // Calculate season consistently with LookAheadWidget (using cycles data)
  const avgCycleLength = prediction?.avg_cycle_length || preferences?.avg_cycle_length || 28;
  const periodLength = preferences?.avg_period_length || 5;
  const lutealLength = preferences?.luteal_phase_length || 13;
  
  const latestCycleStart = cycles?.[0]?.start_date 
    ? startOfDay(parseISO(cycles[0].start_date)) 
    : null;
  
  // Use calculated season (consistent with LookAheadWidget) if we have cycle data, otherwise fallback to prediction
  const currentSeason = latestCycleStart 
    ? getSeasonForDate(todayDate, latestCycleStart, avgCycleLength, periodLength, lutealLength)
    : (prediction?.current_season || 'onbekend');
  
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
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-bold">{seasonLabels[currentSeason]}</h2>
                  {isFertileToday && (
                    <Badge className="bg-white/25 text-white border-0 text-xs px-2 py-0.5">
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
              <AlertCircle className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Mogelijk:</span>
              <span className="text-foreground">{symptoms.join(' · ')}</span>
            </div>
          </div>
        )}

        {/* Yesterday's Analysis - Orthomolecular advice */}
        {dailyAnalysis?.hasYesterdayData && (
          <div className="p-4 border-b border-border/20 bg-white/30 dark:bg-black/10">
            <div className="flex items-start gap-2 mb-2">
              <Pill className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-sm font-semibold text-foreground">Gisteren & Advies</span>
            </div>

            {dailyAnalysis.yesterdaySummary && (
              <p className="text-xs text-muted-foreground mb-2">{dailyAnalysis.yesterdaySummary}</p>
            )}

            {/* Highlights */}
            {dailyAnalysis.highlights.length > 0 && (
              <div className="space-y-1 mb-2">
                {dailyAnalysis.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-success-foreground">
                    <Check className="h-3 w-3" />
                    <span>{h.replace('✓ ', '')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Improvements */}
            {dailyAnalysis.improvements.length > 0 && (
              <div className="space-y-1 mb-3">
                {dailyAnalysis.improvements.slice(0, 2).map((imp, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <X className="h-3 w-3 text-muted-foreground mt-0.5" />
                    <span>{imp}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Orthomolecular tips */}
            {dailyAnalysis.orthomolecular && currentSeason !== 'onbekend' && (
              <div className="pt-2 border-t border-border/20">
                <p className="text-xs font-medium text-foreground mb-1">
                  Orthomoleculair voor {seasonLabels[currentSeason].toLowerCase()}:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground font-medium">Mineralen:</p>
                    <p className={seasonTextColors[currentSeason]}>
                      {dailyAnalysis.orthomolecular.minerals.slice(0, 2).join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium">Voeding:</p>
                    <p className={seasonTextColors[currentSeason]}>
                      {dailyAnalysis.orthomolecular.foods[0]?.split(',')[0]}
                    </p>
                  </div>
                </div>
                {dailyAnalysis.orthomolecular.avoid.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Vermijd: {dailyAnalysis.orthomolecular.avoid[0]}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Coaching section - only show if no daily analysis */}
        {coachingTips.length > 0 && !dailyAnalysis?.hasYesterdayData && (
          <div className="p-4 border-b border-border/20 bg-white/30 dark:bg-black/10">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-sm font-semibold text-foreground">Persoonlijk advies</span>
            </div>
            <ul className="space-y-1">
              {coachingTips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 divide-x divide-border/20">
          {/* Food section */}
          <Link to="/diary" className="p-4 hover:bg-white/40 dark:hover:bg-black/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="h-4 w-4 text-muted-foreground" />
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
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/20">💡 {foodTip}</p>
          </Link>

          {/* Movement section */}
          <Link to="/bewegen" className="p-4 hover:bg-white/40 dark:hover:bg-black/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Bewegen</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
            {workout ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{workout.recommendedMinutes} min aanbevolen</p>
                <p className="text-xs text-muted-foreground">
                  {workout.exercises.length} oefeningen beschikbaar
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Bekijk oefeningen →</p>
            )}
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/20">💡 {movementTip}</p>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}