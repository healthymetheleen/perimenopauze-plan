import { useState } from 'react';
import { format, subDays, addDays, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
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
  calculatePhaseAndPredictions,
  seasonColors,
  seasonLabels,
  phaseLabels,
} from '@/hooks/useCycle';
import {
  Droplets,
  Calendar,
  TrendingUp,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Snowflake,
  Leaf,
  Sun,
  Wind,
  Utensils,
  Dumbbell,
  Briefcase,
  Heart,
} from 'lucide-react';
import { CycleDayLogDialog } from '@/components/cycle/CycleDayLogDialog';

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-5 w-5" />,
  lente: <Leaf className="h-5 w-5" />,
  zomer: <Sun className="h-5 w-5" />,
  herfst: <Wind className="h-5 w-5" />,
  onbekend: <Calendar className="h-5 w-5" />,
};

const seasonTips: Record<string, { voeding: string; training: string; werk: string; herstel: string }> = {
  winter: {
    voeding: 'Focus op ijzerrijk voedsel, warme maaltijden en stabiele bloedsuiker. Denk aan donker bladgroen, peulvruchten en rode biet.',
    training: 'Rustig aan. Wandelen, yoga, stretching. Luister naar je lichaam en forceer niet.',
    werk: 'Plannen, afronden, minder meetings. Ideaal voor reflectie en strategisch denken.',
    herstel: 'Extra slaap, warmte, grenzen stellen. Dit is de tijd om te herstellen.',
  },
  lente: {
    voeding: 'Veel verse groenten, voldoende eiwit, koolhydraten rondom training voor optimale energie.',
    training: 'Opbouwen! Kracht training, intervallen als je je goed voelt. Je insulinegevoeligheid is nu optimaal.',
    werk: 'Start nieuwe projecten, brainstormen, presentaties. Creativiteit piekt.',
    herstel: 'Socialer, meer energie voor activiteiten. Maar blijf slaap prioriteren.',
  },
  zomer: {
    voeding: 'Licht maar voedzaam. Voldoende zout en hydratatie, vooral bij warm weer of intensieve training.',
    training: 'Dit is je moment! PR mogelijkheden, intensievere sessies als je herstel goed is.',
    werk: 'Pitches, onderhandelen, zichtbaarheid. Je communiceert nu het beste.',
    herstel: 'Geniet van sociale contacten, maar waak voor overstimulatie.',
  },
  herfst: {
    voeding: 'Stabiele maaltijdfrequentie, eiwit bij ontbijt, minder ultrabewerkt en alcohol. Magnesiumrijke voeding helpt.',
    training: 'Kracht behouden, minder high intensity als je prikkelbaar bent. Luister naar je lichaam.',
    werk: 'Structureren, deadlines slim plannen. Minder nieuwe projecten starten.',
    herstel: 'Extra focus op slaap en stressregulatie. Dit voorkomt PMS klachten.',
  },
  onbekend: {
    voeding: 'Focus op gevarieerd, voedzaam eten met voldoende eiwit en vezels.',
    training: 'Beweeg op een manier die goed voelt. Luister naar je lichaam.',
    werk: 'Plan je taken flexibel in.',
    herstel: 'Zorg voor voldoende rust en ontspanning.',
  },
};

export default function CyclePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDayLog, setShowDayLog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: preferences, isLoading: prefsLoading } = useCyclePreferences();
  const { data: cycles, isLoading: cyclesLoading } = useCycles(6);
  const { data: bleedingLogs, isLoading: bleedingLoading } = useBleedingLogs(90);
  const { data: symptomLogs } = useCycleSymptomLogs(90);
  const { data: latestPrediction } = useLatestPrediction();

  const logBleeding = useLogBleeding();
  const startCycle = useStartCycle();

  const isLoading = prefsLoading || cyclesLoading || bleedingLoading;

  // Redirect to onboarding if not completed
  if (!prefsLoading && !preferences?.onboarding_completed) {
    navigate('/cycle/onboarding');
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingState message="Cyclusdata laden..." />
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
  const tips = seasonTips[currentSeason];

  // Quick log today
  const handleQuickLog = async (intensity: 'spotting' | 'licht' | 'normaal' | 'hevig') => {
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      await logBleeding.mutateAsync({ log_date: today, intensity });
      
      // Check if this should start a new cycle
      const existingToday = bleedingLogs?.find(l => l.log_date === today);
      if (!existingToday && intensity !== 'spotting') {
        // Check if last bleeding was more than 2 days ago
        const lastBleeding = bleedingLogs?.find(l => l.intensity !== 'spotting');
        if (!lastBleeding || subDays(new Date(), 3) > new Date(lastBleeding.log_date)) {
          await startCycle.mutateAsync(today);
          toast({ title: 'Nieuwe cyclus gestart' });
        }
      }
      
      toast({ title: 'Gelogd!' });
    } catch {
      toast({ title: 'Kon niet opslaan', variant: 'destructive' });
    }
  };

  // Generate calendar strip data - 35 days to show full cycle
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const date = addDays(new Date(), i - 7);
    const dateStr = format(date, 'yyyy-MM-dd');
    const bleeding = bleedingLogs?.find(l => l.log_date === dateStr);
    
    // Check if in fertile window
    const isFertile = preferences?.show_fertile_days && 
      prediction.fertile_window_start && 
      prediction.fertile_window_end &&
      isWithinInterval(date, {
        start: parseISO(prediction.fertile_window_start),
        end: parseISO(prediction.fertile_window_end),
      });
    
    // Check if ovulation day
    const isOvulation = prediction.ovulation_min && 
      prediction.ovulation_max &&
      isWithinInterval(date, {
        start: parseISO(prediction.ovulation_min),
        end: parseISO(prediction.ovulation_max),
      });

    return {
      date,
      dateStr,
      isToday: isSameDay(date, new Date()),
      bleeding: bleeding?.intensity,
      isFertile,
      isOvulation,
    };
  });

  // Check if today is in fertile window for notification
  const today = format(new Date(), 'yyyy-MM-dd');
  const isTodayFertile = preferences?.show_fertile_days && 
    prediction.fertile_window_start && 
    prediction.fertile_window_end &&
    isWithinInterval(new Date(), {
      start: parseISO(prediction.fertile_window_start),
      end: parseISO(prediction.fertile_window_end),
    });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Fertile window notification */}
        {isTodayFertile && (
          <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Je bent in je vruchtbare periode</p>
                <p className="text-sm text-green-700 mt-1">
                  Je vruchtbare venster loopt van {format(parseISO(prediction.fertile_window_start!), 'd MMM', { locale: nl })} 
                  {' t/m '} 
                  {format(parseISO(prediction.fertile_window_end!), 'd MMM', { locale: nl })}.
                </p>
                <p className="text-xs text-green-600 mt-2">
                  Let op: dit is een schatting en niet bedoeld als anticonceptie.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Season header */}
        <div className={`rounded-2xl p-6 ${colors.bg}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${colors.accent} text-white`}>
              {seasonIcons[currentSeason]}
            </div>
            <div>
              <h1 className={`text-xl font-semibold ${colors.text}`}>
                {seasonLabels[currentSeason]}
              </h1>
              <p className="text-sm text-muted-foreground">
                {phaseLabels[currentPhase]}
              </p>
            </div>
          </div>
        </div>

        {/* Quick log */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              Vandaag loggen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {[
                { intensity: 'geen' as const, label: 'Geen', color: 'bg-gray-100 text-gray-800' },
                { intensity: 'spotting' as const, label: 'Spotting', color: 'bg-pink-100 text-pink-800' },
                { intensity: 'licht' as const, label: 'Licht', color: 'bg-pink-200 text-pink-900' },
                { intensity: 'normaal' as const, label: 'Normaal', color: 'bg-red-200 text-red-900' },
                { intensity: 'hevig' as const, label: 'Hevig', color: 'bg-red-300 text-red-900' },
              ].map(({ intensity, label, color }) => (
                <Button
                  key={intensity}
                  variant="outline"
                  className={`h-auto py-2 flex-col gap-1 text-xs ${color} border-0`}
                  onClick={() => intensity !== 'geen' && handleQuickLog(intensity)}
                  disabled={logBleeding.isPending || intensity === 'geen'}
                >
                  {intensity !== 'geen' && <Droplets className="h-4 w-4" />}
                  <span>{label}</span>
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-3"
              onClick={() => {
                setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                setShowDayLog(true);
              }}
            >
              Meer details loggen
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Calendar strip */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span>Menstruatie</span>
              </div>
              {preferences?.show_fertile_days && (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span>Vruchtbaar</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Ovulatie</span>
                  </div>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex gap-1 overflow-x-auto pb-2">
              {calendarDays.map(({ date, dateStr, isToday, bleeding, isFertile, isOvulation }) => (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setShowDayLog(true);
                  }}
                  className={`flex-shrink-0 w-10 p-1.5 rounded-lg text-center transition-colors ${
                    isToday ? 'bg-primary text-primary-foreground' : 
                    isFertile ? 'bg-green-50' : 
                    isOvulation ? 'bg-purple-50' : 'hover:bg-muted'
                  }`}
                >
                  <div className="text-[10px] text-muted-foreground">
                    {format(date, 'EEE', { locale: nl })}
                  </div>
                  <div className="text-sm font-medium">{format(date, 'd')}</div>
                  <div className="h-2 flex justify-center gap-0.5 mt-0.5">
                    {bleeding && (
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        bleeding === 'hevig' ? 'bg-red-500' :
                        bleeding === 'normaal' ? 'bg-red-400' :
                        bleeding === 'licht' ? 'bg-pink-400' : 'bg-pink-300'
                      }`} />
                    )}
                    {isFertile && !isOvulation && (
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    )}
                    {isOvulation && (
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Predictions */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Voorspelling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prediction.next_period_start_min && prediction.next_period_start_max && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Volgende menstruatie</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(prediction.next_period_start_min), 'd MMM', { locale: nl })} 
                    {' - '}
                    {format(parseISO(prediction.next_period_start_max), 'd MMM', { locale: nl })}
                  </p>
                </div>
                <Badge variant="outline">
                  {prediction.next_period_confidence}% zeker
                </Badge>
              </div>
            )}

            {preferences?.show_fertile_days && prediction.ovulation_min && prediction.ovulation_max && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Verwachte ovulatie</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(prediction.ovulation_min), 'd MMM', { locale: nl })} 
                      {' - '}
                      {format(parseISO(prediction.ovulation_max), 'd MMM', { locale: nl })}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {prediction.ovulation_confidence}% zeker
                  </Badge>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Vruchtbare dagen zijn een schatting en niet bedoeld als anticonceptie.
                  </span>
                </div>
              </>
            )}

            {prediction.rationale && (
              <p className="text-sm text-muted-foreground italic">
                {prediction.rationale}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cycle syncing tips */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Tips voor {seasonLabels[currentSeason].toLowerCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="voeding">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="voeding" className="text-xs">
                  <Utensils className="h-4 w-4 mr-1" />
                  Eten
                </TabsTrigger>
                <TabsTrigger value="training" className="text-xs">
                  <Dumbbell className="h-4 w-4 mr-1" />
                  Bewegen
                </TabsTrigger>
                <TabsTrigger value="werk" className="text-xs">
                  <Briefcase className="h-4 w-4 mr-1" />
                  Werk
                </TabsTrigger>
                <TabsTrigger value="herstel" className="text-xs">
                  <Heart className="h-4 w-4 mr-1" />
                  Herstel
                </TabsTrigger>
              </TabsList>
              {Object.entries(tips).map(([key, value]) => (
                <TabsContent key={key} value={key} className="mt-4">
                  <p className="text-sm leading-relaxed">{value}</p>
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
                Aandachtspunten
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
              <CardTitle className="text-lg">Jouw patroon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{prediction.avg_cycle_length}</p>
                  <p className="text-xs text-muted-foreground">dagen gemiddeld</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">±{prediction.cycle_variability || 0}</p>
                  <p className="text-xs text-muted-foreground">dagen variatie</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{cycles?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">cycli gelogd</p>
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
      />
    </AppLayout>
  );
}
