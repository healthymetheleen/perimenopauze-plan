import { useState } from 'react';
import { differenceInMinutes, format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { 
  ArrowRight, Moon, Sun, FileText, UtensilsCrossed, Heart, ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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

  const dateLocale = i18n.language?.startsWith('nl') ? nl : enUS;
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
      toast({ title: t('dashboard.good_night'), description: t('dashboard.sleep_started') });
    } catch {
      toast({ title: t('dashboard.could_not_start'), variant: 'destructive' });
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
      toast({ title: t('dashboard.good_morning'), description: t('dashboard.sleep_saved') });
    } catch {
      toast({ title: t('dashboard.could_not_end'), variant: 'destructive' });
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
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 hover:shadow-soft transition-all"
          >
            <div className="p-2.5 rounded-full bg-primary/10 dark:bg-primary/20">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{t('dashboard.check_in')}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{t('dashboard.energy_mood')}</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/dagboek?openMeal=true')}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 hover:shadow-soft transition-all"
          >
            <div className="p-2.5 rounded-full bg-primary/10 dark:bg-primary/20">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{t('dashboard.meal')}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{t('dashboard.add_meal')}</p>
            </div>
          </button>

          {activeSession ? (
            <button
              onClick={handleWakeUp}
              disabled={endSleep.isPending}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-accent/10 dark:bg-accent/20 border border-accent/30 dark:border-accent/40 hover:shadow-soft transition-all disabled:opacity-50"
            >
              <div className="p-2.5 rounded-full bg-accent/20 dark:bg-accent/30">
                <Sun className="h-5 w-5 text-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{t('dashboard.awake')}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{t('dashboard.stop_sleep')}</p>
              </div>
            </button>
          ) : (
            <button
              onClick={handleStartSleep}
              disabled={startSleep.isPending}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/50 dark:bg-muted/30 border border-border hover:shadow-soft transition-all disabled:opacity-50"
            >
              <div className="p-2.5 rounded-full bg-muted dark:bg-muted/50">
                <Moon className="h-5 w-5 text-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{t('dashboard.sleep')}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{t('dashboard.start_sleep')}</p>
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
                      <p className="text-sm font-medium">{t('dashboard.sleep_widget_title')}</p>
                      {sleepStats && sleepStats.totalSessions > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t('dashboard.sleep_widget_avg', { hours: sleepStats.avgDurationHours.toFixed(1), score: sleepScore })}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t('common.no_data')}</p>
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
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t('dashboard.recent_sessions')}</p>
                    {sleepSessions.slice(0, 5).map((session) => {
                      const sessionDate = new Date(session.sleep_start);
                      return (
                        <div key={session.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                          <div className="text-sm">
                            <span className="font-medium">
                              {format(sessionDate, 'EEEE', { locale: dateLocale })}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              {format(sessionDate, 'd MMM', { locale: dateLocale })}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.duration_minutes 
                              ? `${(session.duration_minutes / 60).toFixed(1)}${i18n.language?.startsWith('nl') ? 'u' : 'h'}`
                              : t('dashboard.in_progress')
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
                      {t('dashboard.view_all_sleep')}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <p>{t('dashboard.no_sessions')}</p>
                    <Link to="/slaap" className="text-primary hover:underline">
                      {t('dashboard.start_first')}
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
            <Card className="glass rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 hover:shadow-soft transition-all">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{t('dashboard.monthly_analysis')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.monthly_description')}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
              </CardContent>
            </Card>
          </Link>
        )}

      </div>

      {/* Sleep Quality Dialog */}
      <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t('dashboard.sleep_quality_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Wake feeling */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('dashboard.wake_feeling')}</Label>
              <RadioGroup value={wakeFeeling} onValueChange={setWakeFeeling} className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="uitgerust" id="dash-uitgerust" />
                  <Label htmlFor="dash-uitgerust" className="text-sm">{t('dashboard.rested')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oké" id="dash-oke" />
                  <Label htmlFor="dash-oke" className="text-sm">{t('dashboard.okay')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moe" id="dash-moe" />
                  <Label htmlFor="dash-moe" className="text-sm">{t('dashboard.tired')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="uitgeput" id="dash-uitgeput" />
                  <Label htmlFor="dash-uitgeput" className="text-sm">{t('dashboard.exhausted')}</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Quality slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">{t('dashboard.sleep_quality')}</Label>
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
                <span>{t('common.poor')}</span>
                <span>{t('common.excellent')}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={handleConfirmWakeUp}
            className="w-full"
            disabled={endSleep.isPending}
          >
            <Sun className="h-4 w-4 mr-2" />
            {t('common.save')}
          </Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}