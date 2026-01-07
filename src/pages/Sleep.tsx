import { useState } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import {
  useSleepSessions,
  useActiveSleepSession,
  useStartSleep,
  useEndSleep,
  useAddManualSleep,
  useDeleteSleep,
  calculateSleepStats,
  calculateSleepScore,
  generateSleepAdviceKeys,
} from '@/hooks/useSleep';
import { useLatestPrediction } from '@/hooks/useCycle';
import { SleepInsightCard } from '@/components/insights';
import { SleepTimeline } from '@/components/sleep/SleepTimeline';
import { Moon, Sun, Clock, TrendingUp, Lightbulb, BedDouble, AlarmClock, Sparkles, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function SleepPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [qualityScore, setQualityScore] = useState([7]);
  const [wakeFeeling, setWakeFeeling] = useState<string>('');
  const [nightInterruptions, setNightInterruptions] = useState<string>('');
  
  // Manual sleep entry state
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualSleepTime, setManualSleepTime] = useState('23:00');
  const [manualWakeTime, setManualWakeTime] = useState('07:00');
  const [manualQuality, setManualQuality] = useState([7]);

  const dateLocale = i18n.language === 'nl' ? nl : enUS;
  const { data: sessions, isLoading } = useSleepSessions(7);
  const { data: activeSession, isLoading: activeLoading } = useActiveSleepSession();
  const { data: prediction } = useLatestPrediction();
  const startSleep = useStartSleep();
  const endSleep = useEndSleep();
  const addManualSleep = useAddManualSleep();
  const deleteSleep = useDeleteSleep();
  
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const stats = sessions ? calculateSleepStats(sessions) : null;
  const sleepScore = sessions ? calculateSleepScore(sessions) : 0;
  const adviceKeys = sessions ? generateSleepAdviceKeys(sessions) : [];
  const currentSeason = prediction?.current_season || 'onbekend';

  const handleStartSleep = async () => {
    try {
      await startSleep.mutateAsync();
      toast({ title: t('sleep.good_night'), description: t('sleep.sleep_started') });
    } catch {
      toast({ title: t('sleep.could_not_start'), variant: 'destructive' });
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
      toast({ title: t('sleep.good_morning'), description: t('sleep.sleep_saved') });
    } catch {
      toast({ title: t('sleep.could_not_end'), variant: 'destructive' });
    }
  };

  const handleManualSleep = async () => {
    try {
      // Parse sleep time (assume night before if wake time < sleep time)
      const sleepDate = new Date(manualDate);
      const wakeDate = new Date(manualDate);
      
      const [sleepHour, sleepMin] = manualSleepTime.split(':').map(Number);
      const [wakeHour, wakeMin] = manualWakeTime.split(':').map(Number);
      
      sleepDate.setHours(sleepHour, sleepMin, 0, 0);
      wakeDate.setHours(wakeHour, wakeMin, 0, 0);
      
      // If sleep time is after wake time, sleep was the night before
      if (sleepHour > wakeHour || (sleepHour === wakeHour && sleepMin > wakeMin)) {
        sleepDate.setDate(sleepDate.getDate() - 1);
      }
      
      await addManualSleep.mutateAsync({
        sleepStart: sleepDate.toISOString(),
        sleepEnd: wakeDate.toISOString(),
        qualityScore: manualQuality[0],
      });
      
      setShowManualDialog(false);
      toast({ title: t('sleep.sleep_saved_short') });
    } catch (error) {
      toast({ 
        title: t('sleep.could_not_save'), 
        description: error instanceof Error ? error.message : t('diary.try_again'),
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteSleep = async () => {
    if (!deleteSessionId) return;
    try {
      await deleteSleep.mutateAsync(deleteSessionId);
      setDeleteSessionId(null);
      toast({ title: t('sleep.session_deleted') });
    } catch {
      toast({ title: t('sleep.could_not_delete'), variant: 'destructive' });
    }
  };

  // Calculate current sleep duration if sleeping
  const currentSleepDuration = activeSession
    ? differenceInMinutes(new Date(), new Date(activeSession.sleep_start))
    : 0;
  const currentSleepHours = Math.floor(currentSleepDuration / 60);
  const currentSleepMins = currentSleepDuration % 60;

  if (isLoading || activeLoading) {
    return (
      <AppLayout>
        <LoadingState message={t('sleep.loading')} />
      </AppLayout>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-primary bg-primary/10';
    if (score >= 60) return 'text-foreground bg-muted';
    if (score >= 40) return 'text-muted-foreground bg-muted/50';
    return 'text-muted-foreground bg-muted/30';
  };

  return (
    <AppLayout>
      <div className="space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t('sleep.title')}</h1>
            <p className="text-muted-foreground">
              {t('sleep.subtitle')}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/meditatie">
              <Sparkles className="h-4 w-4 mr-2" />
              {t('sleep.meditations')}
            </Link>
          </Button>
        </div>

        {/* Sleep Score */}
        <Card className="rounded-2xl bg-gradient-to-br from-background to-primary/5 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">{t('sleep.sleep_score')}</p>
                <p className="text-4xl font-bold text-foreground">{sleepScore}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('sleep.based_on_7_days')}
                </p>
              </div>
              <div className={`p-4 rounded-full ${getScoreColor(sleepScore)}`}>
                <Moon className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sleep/Wake Button */}
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            {activeSession ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                  <Moon className="h-4 w-4 animate-pulse" />
                  <span className="text-sm font-medium">{t('sleep.sleeping_now')}</span>
                </div>
                <div className="text-3xl font-bold">
                  {currentSleepHours}{i18n.language === 'nl' ? 'u' : 'h'} {currentSleepMins}m
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('sleep.started_at', { time: format(new Date(activeSession.sleep_start), 'HH:mm', { locale: dateLocale }) })}
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleWakeUp}
                  disabled={endSleep.isPending}
                >
                  <Sun className="h-5 w-5 mr-2" />
                  {t('sleep.im_awake')}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {t('sleep.press_when_sleep')}
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleStartSleep}
                  disabled={startSleep.isPending}
                >
                  <Moon className="h-5 w-5 mr-2" />
                  {t('sleep.im_going_to_sleep')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowManualDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('sleep.enter_sleep_later')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Overview */}
        {stats && stats.totalSessions > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('sleep.avg_duration')}</p>
                    <p className="font-semibold">{stats.avgDurationHours.toFixed(1)} {t('sleep.hours')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('sleep.consistency')}</p>
                    <p className="font-semibold">{Math.round(stats.consistency)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <BedDouble className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('sleep.avg_bedtime')}</p>
                    <p className="font-semibold">{stats.avgBedtime || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <AlarmClock className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('sleep.avg_wake_time')}</p>
                    <p className="font-semibold">{stats.avgWakeTime || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sleep Timeline */}
        {sessions && sessions.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('sleep.sleep_sessions')}</CardTitle>
              <CardDescription>
                {t('sleep.visual_overview')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SleepTimeline 
                sessions={sessions} 
                onDeleteSession={(id) => setDeleteSessionId(id)}
              />
            </CardContent>
          </Card>
        )}

        {/* AI Sleep Insight */}
        {stats && stats.totalSessions > 0 && (
          <SleepInsightCard
            avgDuration={`${stats.avgDurationHours.toFixed(1)} ${t('sleep.hours')}`}
            avgQuality={stats.avgQuality ? `${stats.avgQuality.toFixed(1)}/10` : t('sleep.unknown')}
            consistency={`${Math.round(stats.consistency)}%`}
            interruptions={nightInterruptions || undefined}
            cycleSeason={currentSeason !== 'onbekend' ? t(`seasons.${currentSeason === 'lente' ? 'spring' : currentSeason === 'zomer' ? 'summer' : currentSeason === 'herfst' ? 'autumn' : currentSeason}`) : undefined}
          />
        )}

        {/* Advice */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              {t('sleep.sleep_tips')}
            </CardTitle>
            <CardDescription>
              {t('sleep.tips_based_on')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adviceKeys.length > 0 ? (
              <ul className="space-y-3">
                {adviceKeys.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{t(item.key, item.params)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Moon className="h-8 w-8" />}
                title={t('sleep.start_tracking')}
                description={t('sleep.start_tracking_desc')}
              />
            )}
          </CardContent>
        </Card>

        {/* General Sleep Hygiene */}
        <Card className="rounded-2xl bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('sleep.general_hygiene')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>{t('sleep.hygiene_1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>{t('sleep.hygiene_2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>{t('sleep.hygiene_3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>{t('sleep.hygiene_4')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>{t('sleep.hygiene_5')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>{t('sleep.hygiene_6')}</span>
              </li>
            </ul>
            <Button asChild variant="outline" className="w-full mt-4">
              <Link to="/meditatie">
                <Sparkles className="h-4 w-4 mr-2" />
                {t('sleep.view_meditations')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quality Dialog - Extended with sleep experience questions */}
      <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t('sleep.how_did_you_sleep')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Wake feeling */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('sleep.wake_feeling')}</Label>
              <RadioGroup value={wakeFeeling} onValueChange={setWakeFeeling} className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="uitgerust" id="uitgerust" />
                  <Label htmlFor="uitgerust" className="text-sm">{t('sleep.rested')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oke" id="oke" />
                  <Label htmlFor="oke" className="text-sm">{t('sleep.okay')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="onrustig" id="onrustig" />
                  <Label htmlFor="onrustig" className="text-sm">{t('sleep.restless')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="uitgeput" id="uitgeput" />
                  <Label htmlFor="uitgeput" className="text-sm">{t('sleep.exhausted')}</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Night interruptions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('sleep.night_interrupted')}</Label>
              <RadioGroup value={nightInterruptions} onValueChange={setNightInterruptions} className="grid grid-cols-3 gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nee" id="nee" />
                  <Label htmlFor="nee" className="text-sm">{t('sleep.no')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1-2" id="1-2" />
                  <Label htmlFor="1-2" className="text-sm">1-2x</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vaak" id="vaak" />
                  <Label htmlFor="vaak" className="text-sm">{t('sleep.often')}</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Quality score slider */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('sleep.general_quality')}</Label>
              <div className="text-center">
                <span className="text-4xl font-bold">{qualityScore[0]}</span>
                <span className="text-muted-foreground">/10</span>
              </div>
              <Slider
                value={qualityScore}
                onValueChange={setQualityScore}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('common.poor')}</span>
                <span>{t('common.excellent')}</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleConfirmWakeUp}
              disabled={endSleep.isPending}
            >
              {t('common.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Sleep Entry Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t('sleep.enter_sleep_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('sleep.date_woke_up')}</Label>
              <Input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
            </div>

            {/* Sleep time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('sleep.went_to_bed')}</Label>
                <Input
                  type="time"
                  value={manualSleepTime}
                  onChange={(e) => setManualSleepTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('sleep.woke_up')}</Label>
                <Input
                  type="time"
                  value={manualWakeTime}
                  onChange={(e) => setManualWakeTime(e.target.value)}
                />
              </div>
            </div>

            {/* Quality score slider */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('sleep.sleep_quality')}</Label>
              <div className="text-center">
                <span className="text-4xl font-bold">{manualQuality[0]}</span>
                <span className="text-muted-foreground">/10</span>
              </div>
              <Slider
                value={manualQuality}
                onValueChange={setManualQuality}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('common.poor')}</span>
                <span>{t('common.excellent')}</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleManualSleep}
              disabled={addManualSleep.isPending}
            >
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sleep.delete_session')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sleep.delete_session_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSleep} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}