import { useState } from 'react';
import { differenceInMinutes, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  ArrowRight, Moon, Sun, FileText, UtensilsCrossed, Heart, ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DailyReflectionCard, TodayAtAGlance, LookAheadWidget } from '@/components/insights';
import { TrialCountdown } from '@/components/subscription/TrialCountdown';
import { CycleWeekWidget } from '@/components/cycle/CycleWeekWidget';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDailyScores } from '@/hooks/useDiary';
import { useLatestPrediction, useCyclePreferences, seasonLabels } from '@/hooks/useCycle';
import { useSleepSessions, useActiveSleepSession, useStartSleep, useEndSleep, calculateSleepScore, calculateSleepStats } from '@/hooks/useSleep';
import { useToast } from '@/hooks/use-toast';
import { useCanGenerateMonthlyAnalysis } from '@/hooks/useMonthlyAnalysis';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [qualityScore, setQualityScore] = useState([7]);
  const [wakeFeeling, setWakeFeeling] = useState<string>('');
  const [sleepExpanded, setSleepExpanded] = useState(false);
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

  const handleWakeUp = () => {
    setShowQualityDialog(true);
  };

  const handleConfirmWakeUp = async () => {
    if (!activeSession) return;
    try {
      await endSleep.mutateAsync({
        sessionId: activeSession.id,
        qualityScore: qualityScore[0],
      });
      setShowQualityDialog(false);
      setQualityScore([7]);
      setWakeFeeling('');
      toast({ title: 'Goedemorgen! ☀️', description: 'Je slaapsessie is opgeslagen.' });
    } catch {
      toast({ title: 'Kon slaapsessie niet afsluiten', variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="grid gap-4">
        {/* TODAY AT A GLANCE - Main widget with everything */}
        <TodayAtAGlance />

        {/* Quick Action Buttons - 3 columns with descriptions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/cycle?openCheckin=true')}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 hover:shadow-soft transition-all"
          >
            <div className="p-2.5 rounded-full bg-purple-100 dark:bg-purple-900/50">
              <Heart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">Check-in</p>
              <p className="text-[10px] text-purple-600 dark:text-purple-400 leading-tight">Energie & gevoel</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/dagboek?openMeal=true')}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 hover:shadow-soft transition-all"
          >
            <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <UtensilsCrossed className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Maaltijd</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-tight">Toevoegen</p>
            </div>
          </button>

          {activeSession ? (
            <button
              onClick={handleWakeUp}
              disabled={endSleep.isPending}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 hover:shadow-soft transition-all disabled:opacity-50"
            >
              <div className="p-2.5 rounded-full bg-amber-200 dark:bg-amber-800/50">
                <Sun className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Wakker</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-tight">Slaap stoppen</p>
              </div>
            </button>
          ) : (
            <button
              onClick={handleStartSleep}
              disabled={startSleep.isPending}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 hover:shadow-soft transition-all disabled:opacity-50"
            >
              <div className="p-2.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Slaap</p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 leading-tight">Starten</p>
              </div>
            </button>
          )}
        </div>

        {/* Cycle 7-day widget */}
        <CycleWeekWidget />

        {/* Blik Vooruit - Look Ahead Widget */}
        <LookAheadWidget />

        {/* Sleep Card - collapsible with session list */}
        <Card className="glass rounded-2xl">
          <CardContent className="p-4">
            <Collapsible open={sleepExpanded} onOpenChange={setSleepExpanded}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted/50">
                      <Moon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
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
                  <div className="flex items-center gap-2">
                    {sleepExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-4">
                {sleepSessions && sleepSessions.length > 0 ? (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Recente sessies</p>
                    {sleepSessions.slice(0, 5).map((session) => {
                      const sessionDate = new Date(session.sleep_start);
                      return (
                        <div key={session.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                          <div className="text-sm">
                            <span className="font-medium">
                              {format(sessionDate, 'EEEE', { locale: nl })}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              {format(sessionDate, 'd MMM', { locale: nl })}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.duration_minutes 
                              ? `${(session.duration_minutes / 60).toFixed(1)}u`
                              : 'Bezig...'
                            }
                            {session.quality_score && (
                              <span className="ml-2">· {session.quality_score}/10</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <Link 
                      to="/slaap" 
                      className="flex items-center justify-center gap-1 text-xs text-primary hover:underline pt-2"
                    >
                      Alle slaapdata bekijken
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <p>Nog geen slaapsessies gelogd</p>
                    <Link to="/slaap" className="text-primary hover:underline">
                      Start je eerste sessie →
                    </Link>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
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

      </div>

      {/* Sleep Quality Dialog */}
      <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Hoe heb je geslapen?</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Wake feeling */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Hoe voelde je je bij het wakker worden?</Label>
              <RadioGroup value={wakeFeeling} onValueChange={setWakeFeeling} className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="uitgerust" id="dash-uitgerust" />
                  <Label htmlFor="dash-uitgerust" className="text-sm">Uitgerust</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oké" id="dash-oke" />
                  <Label htmlFor="dash-oke" className="text-sm">Oké</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moe" id="dash-moe" />
                  <Label htmlFor="dash-moe" className="text-sm">Moe</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="uitgeput" id="dash-uitgeput" />
                  <Label htmlFor="dash-uitgeput" className="text-sm">Uitgeput</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Quality slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Slaapkwaliteit</Label>
                <span className="text-2xl font-bold text-primary">{qualityScore[0]}/10</span>
              </div>
              <Slider
                value={qualityScore}
                onValueChange={setQualityScore}
                min={1}
                max={10}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slecht</span>
                <span>Uitstekend</span>
              </div>
            </div>
          </div>
          <Button
            onClick={handleConfirmWakeUp}
            className="w-full"
            disabled={endSleep.isPending}
          >
            <Sun className="h-4 w-4 mr-2" />
            Opslaan
          </Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}