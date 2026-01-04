import { format, subDays, differenceInMinutes, isWithinInterval, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  TrendingUp, ArrowRight, Briefcase,
  Snowflake, Leaf, Sun, Wind, Moon, Dumbbell, Utensils, Sparkles, FileText, Heart
} from 'lucide-react';
import { SeasonDecorations } from '@/components/dashboard/SeasonDecorations';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoreBadge } from '@/components/ui/score-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { DailyReflectionCard } from '@/components/insights';
import { MovementWidget } from '@/components/insights/MovementWidget';
import { TrialCountdown } from '@/components/subscription/TrialCountdown';
import { useDailyScores } from '@/hooks/useDiary';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useAuth } from '@/lib/auth';
import { useLatestPrediction, useCyclePreferences, seasonLabels, seasonColors, phaseLabels } from '@/hooks/useCycle';
import { useSleepSessions, useActiveSleepSession, useStartSleep, useEndSleep, calculateSleepScore, calculateSleepStats } from '@/hooks/useSleep';
import { useToast } from '@/hooks/use-toast';
import { useCanGenerateMonthlyAnalysis } from '@/hooks/useMonthlyAnalysis';

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-4 w-4" />,
  lente: <Leaf className="h-4 w-4" />,
  zomer: <Sun className="h-4 w-4" />,
  herfst: <Wind className="h-4 w-4" />,
  onbekend: null,
};

// Phase-based advice for sports/movement/work
const phaseAdvice: Record<string, { sport: string; werk: string; beweging: string }> = {
  menstrual: {
    sport: 'Lichte beweging zoals wandelen, zachte yoga of stretchen. Luister naar je lichaam.',
    werk: 'Plan geen intensieve meetings. Focus op routine taken en rust.',
    beweging: 'Rustige wandelingen, zachte stretches. Vermijd zware workouts.',
  },
  follicular: {
    sport: 'Je energie stijgt! Ideaal voor krachttraining, HIIT of nieuwe sporten uitproberen.',
    werk: 'Beste fase voor creatieve projecten, brainstormen en nieuwe initiatieven.',
    beweging: 'Cardio, dansen, zwemmen. Je lichaam kan meer aan in deze fase.',
  },
  ovulatory: {
    sport: 'Piek van energie en kracht. Perfecte tijd voor intensieve workouts en competitie.',
    werk: 'Uitstekend voor presentaties, onderhandelingen en sociale interactie.',
    beweging: 'Groepslessen, hardlopen, intensieve training. Maak gebruik van deze energie!',
  },
  luteal: {
    sport: 'Moderate intensiteit. Pilates, yoga, rustig joggen. Vermijd overtraining.',
    werk: 'Focus op afronden van projecten, administratie en plannen.',
    beweging: 'Wandelen, fietsen, yoga. Verminder intensiteit richting menstruatie.',
  },
};

// Map season to phase for advice
const seasonToPhase: Record<string, string> = {
  winter: 'menstrual',
  lente: 'follicular',
  zomer: 'ovulatory',
  herfst: 'luteal',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: scores, isLoading, error, refetch } = useDailyScores(7);
  const { data: entitlements } = useEntitlements();
  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  const { data: canGenerateMonthly } = useCanGenerateMonthlyAnalysis();
  const { data: sleepSessions } = useSleepSessions(7);
  const { data: activeSession } = useActiveSleepSession();
  const startSleep = useStartSleep();
  const endSleep = useEndSleep();

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const todayScore = scores?.find(s => s.day_date === today);
  const yesterdayScore = scores?.find(s => s.day_date === yesterday);

  const currentSeason = prediction?.current_season || 'onbekend';
  const currentPhase = prediction?.current_phase || 'unknown';
  const showSeasonBadge = preferences?.onboarding_completed && currentSeason !== 'onbekend';
  
  const sleepScore = sleepSessions ? calculateSleepScore(sleepSessions) : 0;
  const sleepStats = sleepSessions ? calculateSleepStats(sleepSessions) : null;
  
  const phaseKey = seasonToPhase[currentSeason] || 'follicular';
  const currentAdvice = phaseAdvice[phaseKey];

  // Check if today is in fertile window (for users with child wish)
  const isTodayFertile = preferences?.show_fertile_days && 
    prediction?.fertile_window_start && 
    prediction?.fertile_window_end &&
    isWithinInterval(new Date(), {
      start: parseISO(prediction.fertile_window_start),
      end: parseISO(prediction.fertile_window_end),
    });

  // Get season-based background class
  const getSeasonBackgroundClass = () => {
    if (!showSeasonBadge) return 'bg-gradient-subtle';
    switch (currentSeason) {
      case 'winter': return 'bg-gradient-to-br from-blue-50/80 via-slate-50 to-blue-100/60 dark:from-blue-950/40 dark:via-slate-950/30 dark:to-blue-950/40';
      case 'lente': return 'bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-teal-100/50 dark:from-green-950/40 dark:via-emerald-950/30 dark:to-teal-950/40';
      case 'zomer': return 'bg-gradient-to-br from-amber-50/80 via-yellow-50 to-orange-100/60 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/40';
      case 'herfst': return 'bg-gradient-to-br from-orange-50/80 via-amber-50/60 to-rose-100/50 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-rose-950/40';
      default: return 'bg-gradient-subtle';
    }
  };

  // Calculate current sleep duration if sleeping
  const currentSleepDuration = activeSession
    ? differenceInMinutes(new Date(), new Date(activeSession.sleep_start))
    : 0;
  const currentSleepHours = Math.floor(currentSleepDuration / 60);
  const currentSleepMins = currentSleepDuration % 60;

  const handleStartSleep = async () => {
    try {
      await startSleep.mutateAsync();
      toast({ title: 'Welterusten! 🌙', description: 'Je slaapsessie is gestart.' });
    } catch {
      toast({ title: 'Kon slaapsessie niet starten', variant: 'destructive' });
    }
  };

  const handleStopSleep = async () => {
    if (!activeSession) return;
    try {
      await endSleep.mutateAsync({ sessionId: activeSession.id });
      toast({ title: 'Goedemorgen! ☀️', description: 'Je slaapsessie is opgeslagen.' });
    } catch {
      toast({ title: 'Kon slaapsessie niet stoppen', variant: 'destructive' });
    }
  };

  const getScoreGradientClass = (score: number | null) => {
    if (!score) return '';
    if (score >= 70) return 'score-gradient-high';
    if (score >= 40) return 'score-gradient-medium';
    return 'score-gradient-low';
  };

  const getSleepScoreColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  // Get season accent for decorative elements
  const getSeasonAccent = () => {
    const colors = seasonColors[currentSeason] ?? seasonColors.onbekend;
    return colors;
  };
  const seasonAccent = getSeasonAccent();

  return (
    <AppLayout>
      <div className={`space-y-6 min-h-screen -m-4 p-4 sm:-m-6 sm:p-6 ${getSeasonBackgroundClass()}`}>
        {/* Season Header - Compact on one line */}
        <div className={`rounded-2xl p-4 relative overflow-hidden ${showSeasonBadge ? seasonAccent.bg : 'bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date */}
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold text-foreground">
                  {format(new Date(), "EEEE d MMMM", { locale: nl })}
                </span>
              </div>
              
              {/* Season & Phase badges inline */}
              {showSeasonBadge && (
                <>
                  <div className="h-5 w-px bg-border/50" />
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${seasonAccent.accent} text-white`}>
                    {seasonIcons[currentSeason]}
                    <span>{seasonLabels[currentSeason]}</span>
                  </div>
                  {currentPhase !== 'unknown' && (
                    <span className="text-sm text-muted-foreground">{phaseLabels[currentPhase]}</span>
                  )}
                  
                  {/* Fertile badge inline */}
                  {isTodayFertile && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white animate-pulse">
                      <Heart className="h-3 w-3" />
                      <span>Vruchtbaar</span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {showSeasonBadge && (
              <div className="relative shrink-0">
                <SeasonDecorations season={currentSeason} />
              </div>
            )}
          </div>
        </div>

        {/* Fertility Banner - only for users with child wish (show_fertile_days enabled) */}
        {isTodayFertile && (
          <div>
            <Card className="rounded-2xl bg-gradient-to-r from-green-100 via-emerald-50 to-green-100 border-green-200 dark:from-green-950/50 dark:via-emerald-950/30 dark:to-green-950/50 dark:border-green-800">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-200 dark:bg-green-800">
                  <Heart className="h-5 w-5 text-green-700 dark:text-green-300" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-green-800 dark:text-green-200">Je bent nu vruchtbaar 💚</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Vruchtbare periode t/m {format(parseISO(prediction!.fertile_window_end!), 'd MMMM', { locale: nl })}
                  </p>
                </div>
                <Link to="/cycle">
                  <ArrowRight className="h-5 w-5 text-green-600" />
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Daily Check-in Button */}
        <div>
          <Link to="/cycle">
            <Card className="glass-strong rounded-2xl bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 hover:shadow-soft transition-all">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Dagelijkse check-in</p>
                  <p className="text-sm text-muted-foreground">
                    Log hoe je je voelt, energie, slaap & klachten
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-primary" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Trial Countdown */}
        <div>
          <TrialCountdown />
        </div>

        {/* Today's Food - Single Card with Score + Macros */}
        <div>
          <Link to="/diary">
            <Card className={`glass rounded-2xl ${getScoreGradientClass(todayScore?.day_score ?? null)}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Utensils className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Eten vandaag</span>
                  {todayScore && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {todayScore.meals_count} maaltijden
                    </span>
                  )}
                </div>
                {todayScore ? (
                  <div className="space-y-3">
                    <ScoreBadge score={todayScore.day_score} size="lg" />
                    <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{Math.round(todayScore.kcal_total || 0)}</span>
                        <span className="text-muted-foreground">kcal</span>
                      </div>
                      <div className="h-3 w-px bg-border" />
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{Math.round(todayScore.carbs_g || 0)}g</span>
                        <span className="text-muted-foreground">koolh</span>
                      </div>
                      <div className="h-3 w-px bg-border" />
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{Math.round(todayScore.protein_g || 0)}g</span>
                        <span className="text-muted-foreground">eiwit</span>
                      </div>
                      <div className="h-3 w-px bg-border" />
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{Math.round(todayScore.fiber_g || 0)}g</span>
                        <span className="text-muted-foreground">vezels</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nog niets gelogd</p>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Sleep Score + Start Sleep combined */}
        <div>
          <Card className={`glass rounded-2xl ${sleepScore >= 70 ? 'score-gradient-high' : sleepScore >= 40 ? 'score-gradient-medium' : ''}`}>
            <CardContent className="p-4 space-y-3">
              {/* Sleep score row */}
              <Link to="/slaap" className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                    <Moon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Slaap 7 dagen</p>
                    {sleepStats && sleepStats.totalSessions > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${getSleepScoreColor(sleepScore)}`}>
                          {sleepScore}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          gem. {sleepStats.avgDurationHours.toFixed(1)}u
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Geen data</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              
              {/* Sleep action */}
              <div className="pt-2 border-t">
                {activeSession ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">Je slaapt nu</p>
                      <p className="font-semibold text-indigo-900 dark:text-indigo-100">
                        {currentSleepHours}u {currentSleepMins}m
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={handleStopSleep}
                      disabled={endSleep.isPending}
                    >
                      <Sun className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Klaar om te slapen?</p>
                    <Button 
                      size="sm" 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={handleStartSleep}
                      disabled={startSleep.isPending}
                    >
                      <Moon className="h-4 w-4 mr-1" />
                      Start slaap
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily AI Reflection */}
        <DailyReflectionCard
          mealsCount={todayScore?.meals_count || 0}
          sleepQuality={sleepStats?.avgQuality ? `${sleepStats.avgQuality.toFixed(1)}/10` : undefined}
          cycleSeason={currentSeason !== 'onbekend' ? seasonLabels[currentSeason] : undefined}
        />

        {/* Movement Widget - contains both movement advice AND life tips */}
        {showSeasonBadge && <MovementWidget />}

        {/* Monthly Analysis CTA */}
        {canGenerateMonthly && (
          <div>
            <Link to="/analyse">
              <Card className="glass rounded-2xl bg-gradient-to-r from-purple-500/10 via-primary/5 to-rose-500/10 hover:shadow-soft transition-all">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-500/20">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Maandelijkse Analyse klaar</p>
                    <p className="text-sm text-muted-foreground">
                      Uitgebreide analyse met hormoon- en voedingsinzichten
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-purple-600" />
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Quick actions - Trends */}
        <Card className="glass rounded-2xl hover:shadow-soft transition-all">
          <Link to="/trends" className="block p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium">Trends & Patronen</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Bekijk je voortgang en ontdek verbanden
            </p>
          </Link>
        </Card>
      </div>
    </AppLayout>
  );
}
