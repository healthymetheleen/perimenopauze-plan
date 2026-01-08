import { useState, useEffect } from 'react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast } from '@/hooks/use-toast';
import {
  useCyclePreferences,
  useCycles,
  useBleedingLogs,
  useCycleSymptomLogs,
  useLatestPrediction,
  useLogBleeding,
  useStartCycle,
  useDeleteCycle,
  calculatePhaseAndPredictions,
  seasonColors,
} from '@/hooks/useCycle';
import {
  Droplets,
  Calendar,
  TrendingUp,
  Sparkles,
  AlertCircle,
  Snowflake,
  Leaf,
  Sun,
  Wind,
  Utensils,
  Dumbbell,
  Briefcase,
  Heart,
  CalendarPlus,
  Trash2,
} from 'lucide-react';
import { CycleDayLogDialog } from '@/components/cycle/CycleDayLogDialog';
import { CycleCalendar } from '@/components/cycle/CycleCalendar';
import { BleedingReminderBanner } from '@/components/cycle/BleedingReminderBanner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-5 w-5" />,
  lente: <Leaf className="h-5 w-5" />,
  zomer: <Sun className="h-5 w-5" />,
  herfst: <Wind className="h-5 w-5" />,
  onbekend: <Calendar className="h-5 w-5" />,
};

export default function CyclePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [showDayLog, setShowDayLog] = useState(false);
  const [dialogTab, setDialogTab] = useState<'bleeding' | 'symptoms'>('symptoms');
  const [showPeriodStart, setShowPeriodStart] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const dateLocale = i18n.language === 'nl' ? nl : enUS;

  // Open check-in dialog if query param is set
  useEffect(() => {
    if (searchParams.get('openCheckin') === 'true') {
      setShowDayLog(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: preferences, isLoading: prefsLoading } = useCyclePreferences();
  const { data: cycles, isLoading: cyclesLoading } = useCycles(6);
  const { data: bleedingLogs, isLoading: bleedingLoading } = useBleedingLogs(90);
  const { data: symptomLogs } = useCycleSymptomLogs(90);
  const { data: latestPrediction } = useLatestPrediction();

  const logBleeding = useLogBleeding();
  const startCycle = useStartCycle();
  const deleteCycle = useDeleteCycle();

  const isLoading = prefsLoading || cyclesLoading || bleedingLoading;

  // Redirect to onboarding if not completed
  if (!prefsLoading && !preferences?.onboarding_completed) {
    navigate('/cycle/onboarding');
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingState message={t('cycle.loading')} />
      </AppLayout>
    );
  }

  // Calculate current phase and predictions
  const prediction = latestPrediction || calculatePhaseAndPredictions(
    cycles || [],
    bleedingLogs || [],
    preferences || null
  );

  const currentSeason = prediction.current_season || 'onbekend';
  const currentPhase = prediction.current_phase || 'onbekend';
  const colors = seasonColors[currentSeason];

  // Get season tips from translations
  const getSeasonTips = (season: string) => {
    const seasonKey = season === 'lente' ? 'spring' : 
                      season === 'zomer' ? 'summer' : 
                      season === 'herfst' ? 'autumn' : 
                      season === 'winter' ? 'winter' : 'unknown';
    return {
      nutrition: t(`season_tips.${seasonKey}.nutrition`, { returnObjects: true }) as string[],
      training: t(`season_tips.${seasonKey}.training`, { returnObjects: true }) as string[],
      work: t(`season_tips.${seasonKey}.work`, { returnObjects: true }) as string[],
      recovery: t(`season_tips.${seasonKey}.recovery`, { returnObjects: true }) as string[],
    };
  };

  const tips = getSeasonTips(currentSeason);

  // Open bleeding dialog for today
  const handleBleedingClick = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setDialogTab('bleeding');
    setShowDayLog(true);
  };

  // Open symptoms dialog for today
  const handleSymptomsClick = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setDialogTab('symptoms');
    setShowDayLog(true);
  };

  // Handle setting period start date manually
  const handleSetPeriodStart = async () => {
    try {
      await startCycle.mutateAsync(periodStartDate);
      // Also log bleeding for that date
      await logBleeding.mutateAsync({ log_date: periodStartDate, intensity: 'normaal' });
      setShowPeriodStart(false);
      toast({ title: t('cycle.cycle_started'), description: t('cycle.season_calculated') });
    } catch {
      toast({ title: t('cycle.could_not_start'), variant: 'destructive' });
    }
  };

  // Check if today is in fertile window for notification
  const isTodayFertile = preferences?.show_fertile_days && 
    prediction.fertile_window_start && 
    prediction.fertile_window_end &&
    isWithinInterval(new Date(), {
      start: parseISO(prediction.fertile_window_start),
      end: parseISO(prediction.fertile_window_end),
    });

  const getSeasonLabel = (season: string) => {
    const seasonKey = season === 'lente' ? 'spring' : 
                      season === 'zomer' ? 'summer' : 
                      season === 'herfst' ? 'autumn' : 
                      season === 'winter' ? 'winter' : 'unknown';
    return t(`seasons.${seasonKey}`);
  };

  const getPhaseLabel = (phase: string) => {
    // Map Dutch database values to translation keys
    return t(`phases.${phase}`, phase);
  };

  return (
    <AppLayout>
      <div className="space-y-6 overflow-x-hidden">
        {/* Fertile window notification */}
        {isTodayFertile && (
          <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">{t('cycle.fertile_notification')}</p>
                <p className="text-sm text-green-700 mt-1">
                  {t('cycle.fertile_window_range', {
                    start: format(parseISO(prediction.fertile_window_start!), 'd MMM', { locale: dateLocale }),
                    end: format(parseISO(prediction.fertile_window_end!), 'd MMM', { locale: dateLocale })
                  })}
                </p>
                <p className="text-xs text-green-600 mt-2">
                  {t('cycle.fertile_disclaimer')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bleeding reminder for early cycle days */}
        {cycles && cycles[0] && (
          <BleedingReminderBanner
            cycleStartDate={cycles[0].start_date}
            hasBleedingToday={!!(bleedingLogs?.find(l => l.log_date === format(new Date(), 'yyyy-MM-dd') && l.intensity !== 'geen'))}
            onLogBleeding={handleBleedingClick}
          />
        )}

        {/* Season header */}
        <div className={`rounded-2xl p-6 ${colors.bg}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${colors.accent} text-white`}>
              {seasonIcons[currentSeason]}
            </div>
            <div>
              <h1 className={`text-xl font-semibold ${colors.text}`}>
                {getSeasonLabel(currentSeason)}
              </h1>
              <p className="text-sm text-muted-foreground">
                {getPhaseLabel(currentPhase)}
              </p>
            </div>
          </div>
        </div>

        {/* Daily logging - symptoms left, bleeding right */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t('cycle.log_today')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('cycle.log_today_desc')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Left: Symptom logging */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {t('cycle.how_feel')}
                </p>
                <Button
                  variant="default"
                  className="w-full h-auto py-3"
                  onClick={handleSymptomsClick}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Heart className="h-5 w-5" />
                    <span className="text-xs font-medium">{t('cycle.check_in')}</span>
                  </div>
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  {t('cycle.energy_mood_symptoms')}
                </p>
              </div>

              {/* Right: Bleeding */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  {t('cycle.bleeding')}
                </p>
                <Button
                  variant="outline"
                  className="w-full h-auto py-3 bg-pink-50 hover:bg-pink-100 border-pink-200"
                  onClick={handleBleedingClick}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Droplets className="h-5 w-5 text-pink-600" />
                    <span className="text-xs font-medium text-pink-800">{t('cycle.log_bleeding')}</span>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground text-xs"
                  onClick={() => setShowPeriodStart(true)}
                >
                  <CalendarPlus className="h-3 w-3 mr-1" />
                  {t('cycle.enter_first_day')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar with season groups - using new component */}
        <CycleCalendar
          prediction={prediction}
          preferences={preferences}
          cycles={cycles || []}
          bleedingLogs={bleedingLogs || []}
          onDayClick={(dateStr) => {
            setSelectedDate(dateStr);
            setDialogTab('symptoms');
            setShowDayLog(true);
          }}
        />
        {/* Predictions & Pattern combined */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t('cycle.prediction_pattern')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pattern info */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">{t('cycle.avg_cycle_length')}</p>
                <p className="font-semibold">
                  {prediction.avg_cycle_length && prediction.avg_cycle_length >= 7 
                    ? `${prediction.avg_cycle_length} ${t('cycle.days')}` 
                    : t('cycle.still_unknown')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('cycle.variation')}</p>
                <p className="font-semibold">
                  {prediction.cycle_variability !== undefined && prediction.cycle_variability !== null && prediction.cycle_variability >= 0
                    ? `±${prediction.cycle_variability} ${t('cycle.days')}` 
                    : t('cycle.still_unknown')}
                </p>
              </div>
            </div>

            {prediction.next_period_start_min && prediction.next_period_start_max && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('cycle.next_period')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(prediction.next_period_start_min), 'd MMM', { locale: dateLocale })} 
                    {' - '}
                    {format(parseISO(prediction.next_period_start_max), 'd MMM', { locale: dateLocale })}
                  </p>
                </div>
                <Badge variant="outline">
                  {t('cycle.confident', { percent: prediction.next_period_confidence })}
                </Badge>
              </div>
            )}

            {preferences?.show_fertile_days && prediction.fertile_window_start && prediction.fertile_window_end && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('cycle.fertile_period')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(prediction.fertile_window_start), 'd MMM', { locale: dateLocale })} 
                    {' - '}
                    {format(parseISO(prediction.fertile_window_end), 'd MMM', { locale: dateLocale })}
                  </p>
                </div>
                <Badge variant="outline">
                  {t('cycle.confident', { percent: prediction.fertile_confidence || prediction.ovulation_confidence })}
                </Badge>
              </div>
            )}

            {preferences?.show_fertile_days && prediction.ovulation_min && prediction.ovulation_max && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('cycle.expected_ovulation')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(prediction.ovulation_min), 'd MMM', { locale: dateLocale })} 
                    {' - '}
                    {format(parseISO(prediction.ovulation_max), 'd MMM', { locale: dateLocale })}
                  </p>
                </div>
                <Badge variant="outline">
                  {t('cycle.confident', { percent: prediction.ovulation_confidence })}
                </Badge>
              </div>
            )}

            {preferences?.show_fertile_days && (
              <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  {t('cycle.fertile_warning')}
                </span>
              </div>
            )}

            {prediction.rationale && (
              <p className="text-sm text-muted-foreground italic">
                {prediction.rationale}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cycle syncing tips - expanded */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('cycle.tips_for', { season: getSeasonLabel(currentSeason).toLowerCase() })}
            </CardTitle>
            <CardDescription>
              {t('cycle.tips_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="nutrition">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="nutrition" className="text-xs">
                  <Utensils className="h-4 w-4 mr-1" />
                  {t('cycle.tab_food')}
                </TabsTrigger>
                <TabsTrigger value="training" className="text-xs">
                  <Dumbbell className="h-4 w-4 mr-1" />
                  {t('cycle.tab_exercise')}
                </TabsTrigger>
                <TabsTrigger value="work" className="text-xs">
                  <Briefcase className="h-4 w-4 mr-1" />
                  {t('cycle.tab_work')}
                </TabsTrigger>
                <TabsTrigger value="recovery" className="text-xs">
                  <Heart className="h-4 w-4 mr-1" />
                  {t('cycle.tab_recovery')}
                </TabsTrigger>
              </TabsList>
              {Object.entries(tips).map(([key, tipList]) => (
                <TabsContent key={key} value={key} className="mt-4">
                  <ul className="space-y-2">
                    {tipList.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm leading-relaxed">
                        <span className="text-primary mt-1">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Watchouts */}
        {prediction.watchouts && prediction.watchouts.length > 0 && (
          <Card className="rounded-2xl border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                {t('cycle.watchouts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {prediction.watchouts.map((w, i) => (
                  <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    {w}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {prediction.avg_cycle_length && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('cycle.your_pattern')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{prediction.avg_cycle_length}</p>
                  <p className="text-xs text-muted-foreground">{t('cycle.days_average')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">±{prediction.cycle_variability || 0}</p>
                  <p className="text-xs text-muted-foreground">{t('cycle.days_variation')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{cycles?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">{t('cycle.cycles_logged')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CycleDayLogDialog
        open={showDayLog}
        onOpenChange={setShowDayLog}
        date={selectedDate}
        defaultTab={dialogTab}
      />

      {/* Period Start Date Dialog */}
      <Dialog open={showPeriodStart} onOpenChange={setShowPeriodStart}>
        <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('cycle.first_day_period')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Show existing cycles */}
            {cycles && cycles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('cycle.existing_cycles')}</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cycles.slice(0, 6).map((cycle) => (
                    <div
                      key={cycle.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-destructive" />
                        <div>
                          <p className="text-sm font-medium">
                            {format(parseISO(cycle.start_date), 'd MMMM yyyy', { locale: dateLocale })}
                          </p>
                          {cycle.computed_cycle_length && (
                            <p className="text-xs text-muted-foreground">
                              {t('cycle.days_cycle', { count: cycle.computed_cycle_length })}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          try {
                            await deleteCycle.mutateAsync(cycle.id);
                            toast({ title: t('cycle.cycle_deleted') });
                          } catch {
                            toast({ title: t('cycle.could_not_delete'), variant: 'destructive' });
                          }
                        }}
                        disabled={deleteCycle.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-2">{t('cycle.add_new_cycle')}</p>
                </div>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              {t('cycle.fill_first_day')}
            </p>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('cycle.date')}</Label>
              <Input
                type="date"
                value={periodStartDate}
                onChange={(e) => setPeriodStartDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSetPeriodStart}
              disabled={startCycle.isPending || logBleeding.isPending}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              {t('cycle.start_cycle')}
            </Button>
            
            {cycles && cycles.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {t('cycle.multiple_cycles_tip')}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}