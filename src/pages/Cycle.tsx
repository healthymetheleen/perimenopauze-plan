import { useState } from 'react';
import { format, subDays, isWithinInterval, parseISO } from 'date-fns';
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
  useDeleteCycle,
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
  CalendarPlus,
  Trash2,
} from 'lucide-react';
import { CycleDayLogDialog } from '@/components/cycle/CycleDayLogDialog';
import { CycleCalendar } from '@/components/cycle/CycleCalendar';
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

const seasonTips: Record<string, { voeding: string[]; training: string[]; werk: string[]; herstel: string[] }> = {
  winter: {
    voeding: [
      'Warme maaltijden ondersteunen je spijsvertering en geven comfort. Denk aan stoofschotels, soepen en stamppotten.',
      'Houd je bloedsuiker stabiel met regelmatige eiwitrijke maaltijden. Vermijd lange periodes zonder eten.',
      'Eet gevarieerd met veel groenten voor voedingsstoffen.',
      'Verminder cafeïne en alcohol voor een betere nachtrust.',
    ],
    training: [
      'Rustig aan is het devies. Je lichaam is bezig met herstellen en herbouwen.',
      'Ideaal voor: wandelen, zachte yoga, stretching, mobility en ademwerk.',
      'Vermijd high intensity training de eerste 2-3 dagen als je hevig bloedt.',
      'Luister écht naar je lichaam - als je moe bent, rust dan.',
      'Techniektraining zonder intensiteit kan wel: focus op vorm, niet op zwaarte.',
    ],
    werk: [
      'Ideaal moment voor reflectie, evaluatie en strategisch denken.',
      'Plan minder meetings en sociale verplichtingen waar mogelijk.',
      'Afronding van lopende taken past beter dan nieuwe projecten starten.',
      'Administratie, plannen en rustig bureauwerk voelen nu natuurlijker.',
      'Stel grenzen: dit is niet het moment om ja te zeggen op alles.',
    ],
    herstel: [
      'Prioriteer slaap: ga eerder naar bed en sta later op als het kan.',
      'Warmte helpt: kruik, warme douche, warme dranken.',
      'Zeg nee tegen niet-essentiële sociale verplichtingen.',
      'Dit is de tijd voor solo-activiteiten: lezen, journaling, rust.',
    ],
  },
  lente: {
    voeding: [
      'Je insulinegevoeligheid is nu optimaal - je lichaam verwerkt koolhydraten efficiënt.',
      'Veel verse groenten en fruit, je eetlust kan wat lager zijn dan in andere fases.',
      'Voldoende eiwit voor spieropbouw (1.6-2g per kg lichaamsgewicht bij training).',
      'Koolhydraten rondom training optimaliseren je prestaties en herstel.',
      'Experimenteer met nieuwe recepten en ingrediënten - je staat er meer voor open nu.',
    ],
    training: [
      'Dit is de fase om op te bouwen! Je lichaam reageert optimaal op trainingsbelasting.',
      'Krachttraining met progressieve overload past uitstekend.',
      'HIIT en intervallen als je je goed voelt - je energieniveau is vaak hoger.',
      'Probeer nieuwe workouts of uitdagingen waar je tegenop zag.',
      'Je herstelt sneller, dus je kunt frequenter trainen.',
    ],
    werk: [
      'Creativiteit en nieuw denken pieken in deze fase.',
      'Start nieuwe projecten, brainstorm, plan de komende maand.',
      'Presentaties, pitches en creatieve sessies lukken nu vaak makkelijker.',
      'Je bent communicatiever en opener - plan belangrijke gesprekken.',
      'Leren en nieuwe vaardigheden oppakken gaat soepeler.',
    ],
    herstel: [
      'Je hebt vaak meer energie voor sociale activiteiten.',
      'Ondanks hogere energie: blijf slaap prioriteren (7-9 uur).',
      'Actief herstel werkt goed: lichte beweging, zwemmen, fietsen.',
      'Je kunt meer aan, maar waak voor overcommitment.',
      'Dit is een goed moment voor preventief zelfzorg: massage, sauna.',
    ],
  },
  zomer: {
    voeding: [
      'Licht maar voedzaam eten voelt vaak het beste. Grote maaltijden kunnen zwaar aanvoelen.',
      'Extra aandacht voor hydratatie - drink voldoende water en voeg elektrolyten toe bij intensieve training.',
      'Voldoende zout in je voeding, vooral als je veel zweet.',
      'Verse salades, gegrilde groenten en lean proteïne passen goed.',
      'Je eetlust kan fluctueren - luister naar je hongersignalen.',
    ],
    training: [
      'Dit is je piek! Je kunt presteren op je hoogste niveau.',
      'PR-pogingen, wedstrijden en testen passen het beste in deze fase.',
      'Je kunt intensievere sessies aan - mits je herstel op orde is.',
      'Competitieve elementen en uitdagingen voelen motiverend.',
      'Let op: na ovulatie zakt dit snel, plan je topprestaties bewust.',
    ],
    werk: [
      'Onderhandelen, pitchen en overtuigen gaan je makkelijker af.',
      'Je bent op je communicatief sterkst en straalt meer zelfvertrouwen uit.',
      'Plan belangrijke vergaderingen, presentaties en sollicitatiegesprekken.',
      'Netwerken en nieuwe contacten leggen voelt natuurlijker.',
      'Leiderschapstaken en zichtbaarheid passen bij deze fase.',
    ],
    herstel: [
      'Sociale activiteiten voelen minder vermoeiend.',
      'Je libido kan hoger zijn - dit is biologisch bedoeld.',
      'Geniet van sociale contacten, maar waak voor overstimulatie.',
      'Je kunt je supermens voelen - maar rust blijft belangrijk.',
      'Bereid je mentaal voor op de fase die komt: de energiedip na ovulatie.',
    ],
  },
  herfst: {
    voeding: [
      'Stabiele maaltijdfrequentie is cruciaal - sla geen maaltijden over.',
      'Begin elke dag met eiwit: dit stabiliseert je bloedsuiker en stemming.',
      'Verminder ultrabewerkte voeding, suiker en alcohol - deze kunnen klachten verergeren.',
      'Voedzame voeding (noten, zaden, donkere chocolade, bladgroen) helpt.',
      'Complexe koolhydraten (zoete aardappel, quinoa) ondersteunen je energie.',
    ],
    training: [
      'Kracht behouden is het doel, niet per se PR\'s jagen.',
      'Minder high intensity als je prikkelbaar of vermoeid bent.',
      'Steady-state cardio en matige krachttraining werken vaak beter.',
      'Luister naar je lichaam - soms is rust beter dan doorduwen.',
      'Yoga en pilates kunnen helpen bij spanning en onrust.',
      'De week voor je menstruatie: overweeg intensiteit te verlagen.',
    ],
    werk: [
      'Structureren, organiseren en afronden past beter dan starten.',
      'Plan deadlines slim - liefst niet vlak voor je menstruatie.',
      'Detail-georiënteerd werk kan goed gaan - je bent kritischer.',
      'Start minder nieuwe grote projecten.',
      'Wees mild voor jezelf als concentratie lastiger is.',
      'Solo-werk kan productiever voelen dan teamprojecten.',
    ],
    herstel: [
      'Slaap wordt extra belangrijk - je hebt vaak meer nodig.',
      'Stress heeft nu meer impact - actieve stressregulatie is essentieel.',
      'Ademhaling, meditatie en rust voorkomt dat spanning opbouwt.',
      'Sociale energie kan lager zijn - plan bewust minder.',
      'Warme baden en vroeg naar bed helpen bij herstel.',
      'Dit is preventie: wat je nu doet bepaalt hoe je je voelt.',
    ],
  },
  onbekend: {
    voeding: [
      'Focus op gevarieerd, voedzaam eten met voldoende eiwit en vezels.',
      'Eet regelmatig om je bloedsuiker stabiel te houden.',
      'Drink voldoende water gedurende de dag.',
    ],
    training: [
      'Beweeg op een manier die goed voelt. Luister naar je lichaam.',
      'Varieer tussen intensieve en rustige dagen.',
      'Rust is ook training.',
    ],
    werk: [
      'Plan je taken flexibel in.',
      'Wees mild voor jezelf op dagen met minder energie.',
    ],
    herstel: [
      'Zorg voor voldoende rust en ontspanning.',
      'Prioriteer slaap en stressmanagement.',
    ],
  },
};

export default function CyclePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDayLog, setShowDayLog] = useState(false);
  const [showPeriodStart, setShowPeriodStart] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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

  // Handle setting period start date manually
  const handleSetPeriodStart = async () => {
    try {
      await startCycle.mutateAsync(periodStartDate);
      // Also log bleeding for that date
      await logBleeding.mutateAsync({ log_date: periodStartDate, intensity: 'normaal' });
      setShowPeriodStart(false);
      toast({ title: 'Cyclus gestart! 🩸', description: 'Je seizoen wordt berekend op basis van deze datum.' });
    } catch {
      toast({ title: 'Kon cyclus niet starten', variant: 'destructive' });
    }
  };

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
      <div className="space-y-6 overflow-x-hidden">
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

        {/* Daily logging - focused on symptoms first */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Vandaag loggen
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Log hoe je je voelt - bloedverlies kun je apart aangeven
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary action - symptom logging */}
            <Button
              variant="default"
              className="w-full h-auto py-4"
              onClick={() => {
                setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                setShowDayLog(true);
              }}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Symptomen & gevoel loggen</p>
                  <p className="text-xs opacity-80">Energie, mood, slaap, klachten</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 ml-auto" />
            </Button>

            {/* Secondary - bleeding (collapsible feel) */}
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                Bloedverlies vandaag?
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { intensity: 'geen' as const, label: 'Geen', color: 'bg-muted text-muted-foreground' },
                  { intensity: 'spotting' as const, label: 'Spotting', color: 'bg-pink-100 text-pink-800' },
                  { intensity: 'licht' as const, label: 'Licht', color: 'bg-pink-200 text-pink-900' },
                  { intensity: 'normaal' as const, label: 'Normaal', color: 'bg-red-200 text-red-900' },
                  { intensity: 'hevig' as const, label: 'Hevig', color: 'bg-red-300 text-red-900' },
                ].map(({ intensity, label, color }) => (
                  <Button
                    key={intensity}
                    variant="outline"
                    size="sm"
                    className={`h-auto py-1.5 text-xs ${color} border-0`}
                    onClick={() => intensity !== 'geen' && handleQuickLog(intensity)}
                    disabled={logBleeding.isPending || intensity === 'geen'}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              
              {/* Quick set period start date */}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowPeriodStart(true)}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Eerste dag menstruatie invoeren
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
            setShowDayLog(true);
          }}
        />
        {/* Predictions & Pattern combined */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Voorspelling & Patroon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pattern info */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">Gem. cycluslengte</p>
                <p className="font-semibold">
                  {prediction.avg_cycle_length && prediction.avg_cycle_length >= 7 
                    ? `${prediction.avg_cycle_length} dagen` 
                    : 'Nog onbekend'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Variatie</p>
                <p className="font-semibold">
                  {prediction.cycle_variability !== undefined && prediction.cycle_variability !== null && prediction.cycle_variability >= 0
                    ? `±${prediction.cycle_variability} dagen` 
                    : 'Nog onbekend'}
                </p>
              </div>
            </div>

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

            {preferences?.show_fertile_days && prediction.fertile_window_start && prediction.fertile_window_end && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Vruchtbare periode</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(prediction.fertile_window_start), 'd MMM', { locale: nl })} 
                    {' - '}
                    {format(parseISO(prediction.fertile_window_end), 'd MMM', { locale: nl })}
                  </p>
                </div>
                <Badge variant="outline">
                  {prediction.fertile_confidence || prediction.ovulation_confidence}% zeker
                </Badge>
              </div>
            )}

            {preferences?.show_fertile_days && prediction.ovulation_min && prediction.ovulation_max && (
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
            )}

            {preferences?.show_fertile_days && (
              <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Vruchtbare dagen zijn een schatting en niet bedoeld als anticonceptie.
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
              Tips voor {seasonLabels[currentSeason].toLowerCase()}
            </CardTitle>
            <CardDescription>
              Praktische adviezen afgestemd op je huidige cyclusfase
            </CardDescription>
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

      {/* Period Start Date Dialog */}
      <Dialog open={showPeriodStart} onOpenChange={setShowPeriodStart}>
        <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Eerste dag menstruatie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Show existing cycles */}
            {cycles && cycles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Bestaande cycli</p>
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
                            {format(parseISO(cycle.start_date), 'd MMMM yyyy', { locale: nl })}
                          </p>
                          {cycle.computed_cycle_length && (
                            <p className="text-xs text-muted-foreground">
                              {cycle.computed_cycle_length} dagen cyclus
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
                            toast({ title: 'Cyclus verwijderd' });
                          } catch {
                            toast({ title: 'Kon cyclus niet verwijderen', variant: 'destructive' });
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
                  <p className="text-sm font-medium mb-2">Nieuwe cyclus toevoegen</p>
                </div>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              Vul de eerste dag van je menstruatie in. 
              Hiermee berekenen we in welk seizoen je nu zit.
            </p>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Datum</Label>
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
              Cyclus starten
            </Button>
            
            {cycles && cycles.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Tip: Als je per ongeluk meerdere cycli hebt toegevoegd, kun je de oude verwijderen.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
