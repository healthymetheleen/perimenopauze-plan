import { useState } from 'react';
import { format, addDays, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  Snowflake, Leaf, Sun, Wind, ChevronRight, ChevronDown, 
  Utensils, Calendar, Sparkles, Target
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLatestPrediction, useCyclePreferences, useCycles, seasonLabels, getSeasonForDate } from '@/hooks/useCycle';

// Types
type Season = 'winter' | 'lente' | 'zomer' | 'herfst' | 'onbekend';
type RiskLevel = 'laag' | 'middel' | 'hoog';

interface DayForecast {
  date: Date;
  dayName: string;
  season: Season;
  sleep: RiskLevel;
  cravings: RiskLevel;
  unrest: RiskLevel;
  dayInCycle: number;
  isTransitionDay: boolean;
}

// Season icons
const seasonIcons: Record<Season, React.ReactNode> = {
  winter: <Snowflake className="h-4 w-4" />,
  lente: <Leaf className="h-4 w-4" />,
  zomer: <Sun className="h-4 w-4" />,
  herfst: <Wind className="h-4 w-4" />,
  onbekend: <Sparkles className="h-4 w-4" />,
};

// Season badge colors using semantic tokens
const seasonBadgeColors: Record<Season, string> = {
  winter: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  lente: 'bg-green-500/10 text-green-700 dark:text-green-300',
  zomer: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  herfst: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  onbekend: 'bg-muted text-muted-foreground',
};

// Season block background colors for Nu/Daarna pills
const seasonBlockColors: Record<Season, string> = {
  winter: 'bg-blue-100/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800',
  lente: 'bg-green-100/60 dark:bg-green-950/40 border border-green-200 dark:border-green-800',
  zomer: 'bg-amber-100/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800',
  herfst: 'bg-orange-100/60 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800',
  onbekend: 'bg-muted/30',
};

// Season text colors for labels
const seasonTextColors: Record<Season, string> = {
  winter: 'text-blue-700 dark:text-blue-300',
  lente: 'text-green-700 dark:text-green-300',
  zomer: 'text-amber-700 dark:text-amber-300',
  herfst: 'text-orange-700 dark:text-orange-300',
  onbekend: 'text-muted-foreground',
};

// Risk level indicator colors
const riskColors: Record<RiskLevel, string> = {
  laag: 'bg-green-500',
  middel: 'bg-amber-500',
  hoog: 'bg-red-500',
};

// Fallback template for same-season or unknown transitions
const defaultTemplate = {
  quote: 'Focus op ritme en balans in deze fase.',
  feelings: [
    'Je energie kan stabiel zijn, maar blijf letten op signalen.',
    'Luister naar je lichaam en geef het wat het nodig heeft.',
  ],
  focus: [
    'Houd je ritme vast met regelmatige maaltijden.',
    'Zorg voor voldoende slaap en beweging.',
  ],
  eatingTips: [
    {
      action: 'Eet regelmatig en gevarieerd',
      examples: ['Groenten', 'Eiwitten', 'Gezonde vetten'],
    },
  ],
  planningTips: [
    { action: 'Plan je week vooruit', details: 'Balans tussen activiteit en rust' },
  ],
};

// Season-specific templates (when staying in same season)
const seasonTemplates: Record<string, typeof defaultTemplate> = {
  winter: {
    quote: 'Rust en herstel staan centraal in je winterfase.',
    feelings: [
      'Je energie kan wat lager zijn - dat is normaal.',
      'Meer behoefte aan warmte en comfort.',
    ],
    focus: [
      'Prioriteer slaap en zachte beweging.',
      'Warme, voedzame maaltijden ondersteunen je lichaam.',
    ],
    eatingTips: [
      {
        action: 'Kies voor warme, voedzame maaltijden',
        examples: ['Soep', 'Stoofpotjes', 'Warme groenten'],
      },
    ],
    planningTips: [
      { action: 'Plan rustige dagen', details: 'Minder sociale verplichtingen' },
    ],
  },
  lente: {
    quote: 'Je energie bouwt op - geniet van deze opwaartse fase!',
    feelings: [
      'Meer energie en motivatie.',
      'Creativiteit en focus nemen toe.',
    ],
    focus: [
      'Dit is een goede tijd om projecten te starten.',
      'Je lichaam reageert goed op training.',
    ],
    eatingTips: [
      {
        action: 'Varieer met verse groenten',
        examples: ['Broccoli', 'Paprika', 'Bladgroenten'],
      },
    ],
    planningTips: [
      { action: 'Start nieuwe projecten', details: 'Je concentratie is nu op z\'n best' },
    ],
  },
  zomer: {
    quote: 'Dit is je piekmomen - benut je energie slim!',
    feelings: [
      'Hoge energie en zelfvertrouwen.',
      'Meer sociale drive.',
    ],
    focus: [
      'Plan belangrijke gesprekken en presentaties.',
      'Geniet, maar waak voor overcommitment.',
    ],
    eatingTips: [
      {
        action: 'Blijf gehydrateerd',
        examples: ['Water', 'Kruidenthee', 'Waterrijke groenten'],
      },
    ],
    planningTips: [
      { action: 'Plan je hoogtepunten', details: 'Belangrijke meetings, sportwedstrijden' },
    ],
  },
  herfst: {
    quote: 'Tijd voor structuur en zelfzorg in je herfstfase.',
    feelings: [
      'Energie kan fluctueren.',
      'Meer behoefte aan ritme en rust.',
    ],
    focus: [
      'Stabiele bloedsuiker helpt met stemmingswisselingen.',
      'Vroeg naar bed, minder prikkels.',
    ],
    eatingTips: [
      {
        action: 'Eet op vaste tijden',
        examples: ['3 hoofdmaaltijden', 'Beperkt snacken'],
      },
    ],
    planningTips: [
      { action: 'Structureer je week', details: 'Minder spontane plannen, meer rust' },
    ],
  },
};

// Season transition templates
const transitionTemplates: Record<string, typeof defaultTemplate> = {
  'herfst-winter': {
    quote: 'De komende dagen: minder pushen, meer beschermen.',
    feelings: [
      'Meer behoefte aan rust en comfort food, vooral einde middag.',
      'Slaap kan lichter zijn en je kunt sneller wakker worden.',
      'Je kunt iets minder stressbestendig voelen, kleine dingen komen harder binnen.',
    ],
    focus: [
      'Bloedsuiker rustiger houden met vaste maaltijden en eiwit bij ontbijt.',
      'Slaap beschermen met eerder avondeten en minder prikkels laat.',
    ],
    eatingTips: [
      {
        action: 'Ontbijt met 25 tot 35 gram eiwit',
        examples: ['2 tot 3 eieren met groenten', 'Skyr/kwark met bessen', 'Restjes avondeten met extra eiwit'],
      },
      {
        action: 'Laatste echte maaltijd uiterlijk 3 uur voor slapen',
        examples: ['Yoghurt', 'Eitje', 'Kaas met komkommer'],
      },
    ],
    planningTips: [
      { action: 'Plan 2 avonden zonder afspraken', details: 'Doel: eerder naar bed, scherm uit 45 minuten voor slaap' },
      { action: 'Training slim', details: '2x kracht of stevig wandelen, 1x yoga of rustige flow. Geen max intensiteit.' },
    ],
  },
  'winter-lente': {
    quote: 'De komende dagen: rustig opbouwen, je energie komt terug.',
    feelings: [
      'Energie komt langzaam terug.',
      'Meer zin in plannen en bewegen.',
      'Minder cravings, meer stabiliteit.',
    ],
    focus: [
      'Langzaam opbouwen van activiteiten, niet meteen vol gas.',
      'Gevarieerd eten ondersteunt je energieherstel.',
    ],
    eatingTips: [
      {
        action: 'Meer variatie in groenten',
        examples: ['Spinazie', 'Broccoli', 'Paprika'],
      },
      {
        action: 'Blijf eiwit vasthouden, vooral ontbijt',
        examples: ['Eieren', 'Yoghurt met noten', 'Vis'],
      },
    ],
    planningTips: [
      { action: 'Pak 1 grotere taak op', details: 'Je concentratie is beter in deze fase' },
      { action: 'Voeg 1 extra krachttraining toe', details: 'Je spieren kunnen nu meer aan' },
    ],
  },
  'lente-zomer': {
    quote: 'De komende dagen: geniet van je piek energie!',
    feelings: [
      'Meer drive, meer zin in actie.',
      'Meer sociale energie.',
      'Risico op overcommitment.',
    ],
    focus: [
      'Benut je energie voor belangrijke taken en gesprekken.',
      'Plan ook herstel, anders klapt het later terug.',
    ],
    eatingTips: [
      {
        action: 'Eiwit en vezels blijven basis',
        examples: ['Salade met kip', 'Vis met groenten', 'Bonen en peulvruchten'],
      },
      {
        action: 'Carbs rondom training',
        examples: ['Havermout', 'Rijst', 'Zoete aardappel'],
      },
    ],
    planningTips: [
      { action: 'Plan intensievere trainingen', details: 'HIIT, hardlopen, groepslessen' },
      { action: 'Max 1-2 drukke avonden achter elkaar', details: 'Bewaar ook rust' },
    ],
  },
  'zomer-herfst': {
    quote: 'De komende dagen: terug naar ritme en bescherming.',
    feelings: [
      'Meer behoefte aan ritme.',
      'Sneller overprikkeld.',
      'Trek neemt wat toe.',
    ],
    focus: [
      'Structuur in je week aanbrengen.',
      'Vroegere avonden en stabiele maaltijdtijden.',
    ],
    eatingTips: [
      {
        action: 'Terug naar vaste eetmomenten',
        examples: ['3 hoofdmaaltijden', 'Max 1-2 snacks', 'Geen grazen'],
      },
      {
        action: 'Meer warme maaltijden',
        examples: ['Soep', 'Stoofpot', 'Curry'],
      },
    ],
    planningTips: [
      { action: 'Structuur in week', details: 'Plan vooruit, minder spontaan' },
      { action: 'Training steady, minder pieken', details: 'Wandelen, yoga, lichte kracht' },
    ],
  },
};

// Helper function to get template safely
function getTemplate(currentSeason: string, nextSeason: string, transitionKey: string | null): typeof defaultTemplate {
  // First try transition template
  if (transitionKey && transitionTemplates[transitionKey]) {
    return transitionTemplates[transitionKey];
  }
  
  // Try alternative transition key
  const altKey = `${currentSeason}-${nextSeason}`;
  if (transitionTemplates[altKey]) {
    return transitionTemplates[altKey];
  }
  
  // Use season-specific template for same-season
  if (seasonTemplates[currentSeason]) {
    return seasonTemplates[currentSeason];
  }
  
  // Fallback to default
  return defaultTemplate;
}

// Calculate risk levels based on season and transition
function calculateRiskLevels(season: Season, isTransition: boolean): { sleep: RiskLevel; cravings: RiskLevel; unrest: RiskLevel } {
  const baseRisks: Record<Season, { sleep: RiskLevel; cravings: RiskLevel; unrest: RiskLevel }> = {
    winter: { sleep: 'middel', cravings: 'laag', unrest: 'laag' },
    lente: { sleep: 'laag', cravings: 'laag', unrest: 'laag' },
    zomer: { sleep: 'laag', cravings: 'laag', unrest: 'middel' },
    herfst: { sleep: 'hoog', cravings: 'hoog', unrest: 'hoog' },
    onbekend: { sleep: 'middel', cravings: 'middel', unrest: 'middel' },
  };

  const risks = baseRisks[season];
  
  // Increase risks during transition days
  if (isTransition) {
    return {
      sleep: risks.sleep === 'laag' ? 'middel' : 'hoog',
      cravings: risks.cravings === 'laag' ? 'middel' : 'hoog',
      unrest: risks.unrest === 'laag' ? 'middel' : 'hoog',
    };
  }
  
  return risks;
}

function RiskDots({ level }: { level: RiskLevel }) {
  return (
    <div className="flex gap-0.5">
      <div className={`w-1.5 h-1.5 rounded-full ${riskColors[level]}`} />
      <div className={`w-1.5 h-1.5 rounded-full ${level === 'middel' || level === 'hoog' ? riskColors[level] : 'bg-muted'}`} />
      <div className={`w-1.5 h-1.5 rounded-full ${level === 'hoog' ? riskColors[level] : 'bg-muted'}`} />
    </div>
  );
}

function DayCard({ day, onClick }: { day: DayForecast; onClick: () => void }) {
  const isToday = differenceInDays(day.date, new Date()) === 0;
  
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[60px] p-2 rounded-xl text-center transition-all hover:bg-muted/50 ${
        isToday ? 'bg-primary/10 ring-1 ring-primary/20' : 'bg-background/50'
      }`}
    >
      <p className="text-xs font-medium text-muted-foreground">{day.dayName}</p>
      <Badge className={`mt-1 text-[10px] px-1.5 py-0 ${seasonBadgeColors[day.season]}`}>
        {seasonIcons[day.season]}
      </Badge>
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-center gap-1">
          <span className="text-[9px] text-muted-foreground">😴</span>
          <RiskDots level={day.sleep} />
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-[9px] text-muted-foreground">🍫</span>
          <RiskDots level={day.cravings} />
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-[9px] text-muted-foreground">😰</span>
          <RiskDots level={day.unrest} />
        </div>
      </div>
    </button>
  );
}

function DayDetailDialog({ day, nextSeason, transitionKey, open, onOpenChange }: {
  day: DayForecast;
  nextSeason: Season;
  transitionKey: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const template = transitionKey ? transitionTemplates[transitionKey] : null;
  const daysUntilTransition = transitionKey ? 2 : null; // Simplified for now
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {format(day.date, 'EEEE d MMMM', { locale: nl })}
            <Badge className={seasonBadgeColors[day.season]}>
              {seasonLabels[day.season]}
            </Badge>
          </DialogTitle>
          {transitionKey && (
            <p className="text-sm text-muted-foreground">
              {seasonLabels[nextSeason]} start over {daysUntilTransition} dagen
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {/* Risk factors */}
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-sm font-medium mb-2">Risicofactoren vandaag</p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-muted-foreground">Slaap</p>
                <Badge variant="outline" className="mt-1">{day.sleep}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Cravings</p>
                <Badge variant="outline" className="mt-1">{day.cravings}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Onrust</p>
                <Badge variant="outline" className="mt-1">{day.unrest}</Badge>
              </div>
            </div>
          </div>
          
          {/* Mini plan for this day */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Jouw mini plan voor vandaag
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Eet een eiwitrijk ontbijt
              </li>
              {day.cravings !== 'laag' && (
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Stop cafeïne om 12:00
                </li>
              )}
              {day.sleep !== 'laag' && (
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Maak vanavond je maaltijd simpel en warm
                </li>
              )}
            </ul>
          </div>
          
          {/* Confidence */}
          <div className="p-3 rounded-lg bg-muted/20 text-xs text-muted-foreground">
            <p className="font-medium">Betrouwbaarheid: Gemiddeld</p>
            <p>Je cyclus is wat wisselend, dus we kijken mee met je klachten.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LookAheadWidget() {
  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  const { data: cycles } = useCycles(1);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayForecast | null>(null);
  
  // Check if onboarding is completed
  if (!preferences?.onboarding_completed || !prediction) {
    return null;
  }
  
  const avgCycleLength = prediction.avg_cycle_length || preferences.avg_cycle_length || 28;
  const periodLength = preferences.avg_period_length || 5;
  const lutealLength = preferences.luteal_phase_length || 13;
  
  // Use the actual cycle start date from cycles table (same as CycleWeekWidget)
  const today = startOfDay(new Date());
  const latestCycleStart = cycles?.[0]?.start_date 
    ? startOfDay(parseISO(cycles[0].start_date)) 
    : null;
  
  // If no cycle start, we can't calculate properly
  if (!latestCycleStart) {
    return null;
  }
  
  // Calculate current day in cycle using actual cycle start
  const currentDayInCycle = differenceInDays(today, latestCycleStart) + 1;
  
  // Calculate current season based on actual cycle start (consistent with CycleWeekWidget)
  const currentSeason = getSeasonForDate(today, latestCycleStart, avgCycleLength, periodLength, lutealLength);
  
  // Generate 5-day forecast
  const forecast: DayForecast[] = [];
  let prevSeason = currentSeason;
  
  for (let i = 0; i < 5; i++) {
    const date = addDays(today, i);
    const dayInCycle = differenceInDays(date, latestCycleStart) + 1;
    const season = getSeasonForDate(date, latestCycleStart, avgCycleLength, periodLength, lutealLength);
    const isTransitionDay = prevSeason !== season && i > 0;
    const risks = calculateRiskLevels(season, isTransitionDay);
    
    forecast.push({
      date,
      dayName: format(date, 'EEE', { locale: nl }),
      season,
      dayInCycle,
      isTransitionDay,
      ...risks,
    });
    
    prevSeason = season;
  }
  
  // Find next season transition in forecast
  const nextSeasonDay = forecast.find(d => d.season !== currentSeason);
  
  // If no transition in 5-day forecast, calculate when next season starts
  const avgPeriodLength = periodLength;
  const follicularEnd = avgPeriodLength + Math.floor((avgCycleLength - avgPeriodLength - lutealLength) / 2);
  const ovulationEnd = follicularEnd + 2;
  const lutealStart = ovulationEnd;
  
  // Calculate days until next season based on current day in cycle
  let calculatedNextSeason: Season = currentSeason;
  let calculatedDaysUntil: number | null = null;
  
  if (currentDayInCycle > 0 && currentDayInCycle <= avgCycleLength) {
    if (currentSeason === 'winter') {
      // Winter ends at periodLength
      calculatedNextSeason = 'lente';
      calculatedDaysUntil = Math.max(0, avgPeriodLength - currentDayInCycle + 1);
    } else if (currentSeason === 'lente') {
      // Lente ends at follicularEnd
      calculatedNextSeason = 'zomer';
      calculatedDaysUntil = Math.max(0, follicularEnd - currentDayInCycle + 1);
    } else if (currentSeason === 'zomer') {
      // Zomer ends at ovulationEnd
      calculatedNextSeason = 'herfst';
      calculatedDaysUntil = Math.max(0, ovulationEnd - currentDayInCycle + 1);
    } else if (currentSeason === 'herfst') {
      // Herfst ends at avgCycleLength (next winter)
      calculatedNextSeason = 'winter';
      calculatedDaysUntil = Math.max(0, avgCycleLength - currentDayInCycle + 1);
    }
  }
  
  // Use forecast transition if found, otherwise use calculated values
  const nextSeason = nextSeasonDay?.season || calculatedNextSeason;
  const daysUntilTransition = nextSeasonDay 
    ? differenceInDays(nextSeasonDay.date, today) 
    : calculatedDaysUntil;
  
  // Determine transition template key
  const transitionKey = daysUntilTransition !== null && daysUntilTransition <= 5
    ? `${currentSeason}-${nextSeason}`
    : null;
  const template = getTemplate(currentSeason, nextSeason, transitionKey);
  
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <Card className="rounded-2xl overflow-hidden border shadow-soft">
      <CardContent className="p-0">
        {/* Season Quote Header */}
        <div className="p-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b">
          <p className="text-sm font-medium text-center text-foreground">
            ✨ {template.quote}
          </p>
        </div>
        
        {/* Season Pills */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-xl ${seasonBlockColors[currentSeason]}`}>
            <p className="text-xs text-muted-foreground mb-1">Nu</p>
            <div className={`flex items-center gap-2 ${seasonTextColors[currentSeason]}`}>
              {seasonIcons[currentSeason]}
              <span className="font-semibold">{seasonLabels[currentSeason]}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dag {currentDayInCycle > 0 ? currentDayInCycle : '?'} van je cyclus
            </p>
          </div>
          
          <div className={`p-3 rounded-xl ${seasonBlockColors[nextSeason]}`}>
            <p className="text-xs text-muted-foreground mb-1">Daarna</p>
            <div className={`flex items-center gap-2 ${seasonTextColors[nextSeason]}`}>
              {seasonIcons[nextSeason]}
              <span className="font-semibold">{seasonLabels[nextSeason]}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {daysUntilTransition !== null && daysUntilTransition > 0
                ? `Over ${daysUntilTransition} dag${daysUntilTransition > 1 ? 'en' : ''}`
                : 'Binnenkort'}
            </p>
          </div>
        </div>
        
        {/* Transition description - only show if transitioning to different season */}
        {nextSeason !== currentSeason && (
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              Je lichaam schakelt langzaam over richting {seasonLabels[nextSeason].toLowerCase()}.
              De komende dagen kunnen je energie en behoeften veranderen.
            </p>
          </div>
        )}
        
        
        {/* What you might notice */}
        <div className="border-t">
          <button
            onClick={() => toggleSection('feelings')}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Wat je kunt merken
            </span>
            {expandedSection === 'feelings' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {expandedSection === 'feelings' && (
            <div className="px-4 pb-4 space-y-2">
              {template.feelings.map((feeling, i) => (
                <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {feeling}
                </p>
              ))}
            </div>
          )}
        </div>
        
        {/* Focus for this phase */}
        <div className="border-t">
          <button
            onClick={() => toggleSection('focus')}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" />
              Focus komende 5 dagen
            </span>
            {expandedSection === 'focus' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {expandedSection === 'focus' && (
            <div className="px-4 pb-4 space-y-2">
              {template.focus.map((f, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5">
                  <span className="text-primary font-bold">{i + 1}</span>
                  <p className="text-sm">{f}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Plan van aanpak */}
        <div className="border-t p-4">
          <p className="text-sm font-semibold mb-3">📋 Plan van aanpak</p>
          
          {/* Blok A: Eten */}
          <div className="mb-4">
            <button
              onClick={() => toggleSection('eating')}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Eten
              </span>
              {expandedSection === 'eating' ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {expandedSection === 'eating' && (
              <div className="mt-2 space-y-3 pl-6">
                {template.eatingTips.map((tip, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium">{tip.action}</p>
                    <p className="text-xs text-muted-foreground">
                      Voorbeelden: {tip.examples.join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Blok B: Planning */}
          <div className="mb-4">
            <button
              onClick={() => toggleSection('planning')}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Planning
              </span>
              {expandedSection === 'planning' ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {expandedSection === 'planning' && (
              <div className="mt-2 space-y-3 pl-6">
                {template.planningTips.map((tip, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium">{tip.action}</p>
                    <p className="text-xs text-muted-foreground">{tip.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </CardContent>
      
      {/* Day Detail Dialog */}
      {selectedDay && (
        <DayDetailDialog
          day={selectedDay}
          nextSeason={nextSeason}
          transitionKey={transitionKey}
          open={!!selectedDay}
          onOpenChange={(open) => !open && setSelectedDay(null)}
        />
      )}
    </Card>
  );
}
