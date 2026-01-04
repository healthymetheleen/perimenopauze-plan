import { format, subDays, differenceInMinutes } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  CalendarDays, TrendingUp, Activity, ArrowRight, Plus, 
  Snowflake, Leaf, Sun, Wind, Moon, Dumbbell, Utensils, Sparkles, FileText
} from 'lucide-react';
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
import { useDailyScores } from '@/hooks/useDiary';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useAuth } from '@/lib/auth';
import { useLatestPrediction, useCyclePreferences, seasonLabels, seasonColors, phaseLabels } from '@/hooks/useCycle';
import { useSleepSessions, useActiveSleepSession, useStartSleep, calculateSleepScore, calculateSleepStats } from '@/hooks/useSleep';
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

  return (
    <AppLayout>
      <div className="space-y-6 bg-gradient-subtle min-h-screen -m-4 p-4 sm:-m-6 sm:p-6">
        {/* Header with date and action buttons */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-medium text-foreground">
              {format(new Date(), "EEEE d MMMM", { locale: nl })}
            </p>
          </div>
          <Button asChild className="btn-gradient text-primary-foreground shadow-soft">
            <Link to="/diary">
              <Plus className="h-4 w-4 mr-2" />
              Maaltijd
            </Link>
          </Button>
        </div>

        {/* Daily Check-in Button - with more spacing */}
        <div className="pt-2">
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

        {/* Season Badge - Always visible if onboarding completed */}
        {showSeasonBadge && (
          <Link to="/cycle">
            <Card className={`glass rounded-2xl overflow-hidden season-${currentSeason}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-full ${seasonColors[currentSeason].bg}`}>
                  {seasonIcons[currentSeason]}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Huidige fase</p>
                  <p className="font-semibold text-lg">{seasonLabels[currentSeason]}</p>
                  {currentPhase !== 'unknown' && (
                    <p className="text-sm text-muted-foreground">{phaseLabels[currentPhase]}</p>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Scores Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Yesterday's Eating Score */}
          <Link to="/diary">
            <Card className={`glass rounded-2xl h-full ${getScoreGradientClass(yesterdayScore?.day_score ?? null)}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Utensils className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Eten gisteren</span>
                </div>
                {yesterdayScore ? (
                  <div>
                    <ScoreBadge score={yesterdayScore.day_score} size="lg" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {yesterdayScore.meals_count} maaltijden
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Geen data</p>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Sleep Score */}
          <Link to="/slaap">
            <Card className={`glass rounded-2xl h-full ${sleepScore >= 70 ? 'score-gradient-high' : sleepScore >= 40 ? 'score-gradient-medium' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Slaap 7 dagen</span>
                </div>
                {sleepStats && sleepStats.totalSessions > 0 ? (
                  <div>
                    <div className={`text-3xl font-bold ${getSleepScoreColor(sleepScore)}`}>
                      {sleepScore}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gem. {sleepStats.avgDurationHours.toFixed(1)}u slaap
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Geen data</p>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Phase-based Advice */}
        {showSeasonBadge && currentAdvice && (
          <Card className="glass-strong rounded-2xl card-premium">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Advies voor {seasonLabels[currentSeason]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="p-2 rounded-lg bg-accent/20 h-fit">
                    <Dumbbell className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sport & Beweging</p>
                    <p className="text-sm text-muted-foreground">{currentAdvice.sport}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 h-fit">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Werk</p>
                    <p className="text-sm text-muted-foreground">{currentAdvice.werk}</p>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild className="w-full">
                <Link to="/bewegen">
                  Bekijk trainingsschema
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Today's score */}
        <Card className="glass rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Vandaag
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState size="sm" />
            ) : error ? (
              <ErrorState onRetry={() => refetch()} />
            ) : todayScore ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ScoreBadge score={todayScore.day_score} size="lg" />
                  <div>
                    <p className="font-medium">{todayScore.meals_count} maaltijden</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(todayScore.protein_g)}g eiwit · {Math.round(todayScore.fiber_g)}g vezels
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/diary">
                    Bekijken
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={<CalendarDays className="h-8 w-8" />}
                title="Nog niets geregistreerd"
                description="Begin met je eerste maaltijd van vandaag"
                action={{
                  label: 'Start registratie',
                  onClick: () => window.location.href = '/diary',
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Daily AI Reflection */}
        <DailyReflectionCard
          mealsCount={todayScore?.meals_count || 0}
          sleepQuality={sleepStats?.avgQuality ? `${sleepStats.avgQuality.toFixed(1)}/10` : undefined}
          cycleSeason={currentSeason !== 'onbekend' ? seasonLabels[currentSeason] : undefined}
        />

        {/* Movement & Focus Widget */}
        {showSeasonBadge && <MovementWidget />}

        {/* Monthly Analysis CTA - with spacing */}
        {canGenerateMonthly && (
          <div className="mt-6">
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

        {/* Sleep Card */}
        <Card className="glass rounded-2xl overflow-hidden">
          {activeSession ? (
            <Link to="/slaap">
              <CardContent className="p-4 flex items-center gap-4 bg-gradient-to-br from-indigo-100/50 to-purple-100/50 dark:from-indigo-950/30 dark:to-purple-950/30">
                <div className="p-3 rounded-full bg-indigo-200 dark:bg-indigo-800">
                  <Moon className="h-5 w-5 text-indigo-700 dark:text-indigo-300 animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">Je slaapt nu</p>
                  <p className="font-semibold text-lg text-indigo-900 dark:text-indigo-100">
                    {currentSleepHours}u {currentSleepMins}m
                  </p>
                </div>
                <Badge variant="secondary" className="bg-indigo-200 text-indigo-800">
                  Tap om te stoppen
                </Badge>
              </CardContent>
            </Link>
          ) : (
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                <Moon className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Slaap</p>
                <p className="font-medium">Klaar om te slapen?</p>
              </div>
              <Button 
                size="sm" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleStartSleep}
                disabled={startSleep.isPending}
              >
                <Moon className="h-4 w-4 mr-1" />
                Start slaap
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass rounded-2xl hover:shadow-soft transition-all">
            <Link to="/trends" className="block p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">Trends</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Bekijk je voortgang over tijd
              </p>
            </Link>
          </Card>

          <Card className="glass rounded-2xl hover:shadow-soft transition-all">
            <Link to="/patterns" className="block p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-accent/20">
                  <Activity className="h-5 w-5 text-accent-foreground" />
                </div>
                <span className="font-medium">Patronen</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ontdek verbanden
              </p>
            </Link>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
