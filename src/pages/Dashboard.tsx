import { differenceInMinutes } from 'date-fns';
import { 
  TrendingUp, ArrowRight, Moon, Sun, Sparkles, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DailyReflectionCard, TodayAtAGlance } from '@/components/insights';
import { TrialCountdown } from '@/components/subscription/TrialCountdown';
import { CycleWeekWidget } from '@/components/cycle/CycleWeekWidget';
import { useDailyScores } from '@/hooks/useDiary';
import { useLatestPrediction, useCyclePreferences, seasonLabels } from '@/hooks/useCycle';
import { useSleepSessions, useActiveSleepSession, useStartSleep, useEndSleep, calculateSleepScore, calculateSleepStats } from '@/hooks/useSleep';
import { useToast } from '@/hooks/use-toast';
import { useCanGenerateMonthlyAnalysis } from '@/hooks/useMonthlyAnalysis';

export default function DashboardPage() {
  const { toast } = useToast();
  const { data: scores } = useDailyScores(7);
  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  const { data: canGenerateMonthly } = useCanGenerateMonthlyAnalysis();
  const { data: sleepSessions } = useSleepSessions(7);
  const { data: activeSession } = useActiveSleepSession();
  const startSleep = useStartSleep();
  const endSleep = useEndSleep();

  const today = new Date().toISOString().split('T')[0];
  const todayScore = scores?.find(s => s.day_date === today);

  const currentSeason = prediction?.current_season || 'onbekend';
  const showSeasonBadge = preferences?.onboarding_completed && currentSeason !== 'onbekend';
  
  const sleepScore = sleepSessions ? calculateSleepScore(sleepSessions) : 0;
  const sleepStats = sleepSessions ? calculateSleepStats(sleepSessions) : null;


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

  return (
    <AppLayout>
      <div className="grid gap-4">
        {/* TODAY AT A GLANCE - Main widget with everything */}
        <TodayAtAGlance />

        {/* Cycle 7-day widget */}
        <CycleWeekWidget />

        {/* Daily Check-in - compact CTA */}
        <Link to="/cycle">
          <Card className="glass rounded-2xl hover:shadow-soft transition-all">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted/50">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Dagelijkse check-in</p>
                <p className="text-xs text-muted-foreground">Log energie, stemming & klachten</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        {/* Sleep Card - compact */}
        <Card className="glass rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <Link to="/slaap" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted/50">
                  <Moon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Slaap</p>
                  {sleepStats && sleepStats.totalSessions > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Gem. {sleepStats.avgDurationHours.toFixed(1)}u · Score {sleepScore}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nog geen data</p>
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
                    <p className="text-sm font-medium">Je slaapt nu</p>
                    <p className="font-semibold">
                      {currentSleepHours}u {currentSleepMins}m
                    </p>
                  </div>
                  <Button size="sm" onClick={handleStopSleep} disabled={endSleep.isPending}>
                    <Sun className="h-4 w-4 mr-1" />
                    Wakker
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Klaar om te slapen?</p>
                  <Button size="sm" variant="outline" onClick={handleStartSleep} disabled={startSleep.isPending}>
                    <Moon className="h-4 w-4 mr-1" />
                    Start slaap
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>


        {/* Trial Countdown - only if applicable */}
        <TrialCountdown />

        {/* Daily AI Reflection */}
        <DailyReflectionCard
          mealsCount={todayScore?.meals_count || 0}
          sleepQuality={sleepStats?.avgQuality ? `${sleepStats.avgQuality.toFixed(1)}/10` : undefined}
          cycleSeason={currentSeason !== 'onbekend' ? seasonLabels[currentSeason] : undefined}
        />

        {/* Monthly Analysis CTA - only if ready */}
        {canGenerateMonthly && (
          <Link to="/analyse">
            <Card className="glass rounded-2xl bg-gradient-to-r from-purple-500/5 via-primary/5 to-rose-500/5 hover:shadow-soft transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Maandelijkse Analyse</p>
                  <p className="text-xs text-muted-foreground">
                    Uitgebreide inzichten over je cyclus & voeding
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-purple-600" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Trends link - compact */}
        <Link to="/trends">
          <Card className="glass rounded-2xl hover:shadow-soft transition-all">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted/50">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Trends & Patronen</p>
                <p className="text-xs text-muted-foreground">Bekijk je voortgang over tijd</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </AppLayout>
  );
}