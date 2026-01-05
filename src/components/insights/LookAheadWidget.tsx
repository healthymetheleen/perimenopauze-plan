import { useState } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  Snowflake, Leaf, Sun, Wind, ChevronRight, ChevronDown, 
  Utensils, Calendar, Sparkles, Target
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLatestPrediction, useCyclePreferences, seasonLabels, getSeasonForDate } from '@/hooks/useCycle';

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

// Risk level indicator colors
const riskColors: Record<RiskLevel, string> = {
  laag: 'bg-green-500',
  middel: 'bg-amber-500',
  hoog: 'bg-red-500',
};

// Season transition templates
const transitionTemplates: Record<string, {
  quote: string;
  feelings: string[];
  focus: string[];
  eatingTips: { action: string; examples: string[] }[];
  planningTips: { action: string; details: string }[];
}> = {
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
      'Focus op ijzer en B-vitamines voor energieherstel.',
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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayForecast | null>(null);
  
  // Check if onboarding is completed
  if (!preferences?.onboarding_completed || !prediction) {
    return null;
  }
  
  const currentSeason = (prediction.current_season || 'onbekend') as Season;
  const avgCycleLength = prediction.avg_cycle_length || preferences.avg_cycle_length || 28;
  const periodLength = preferences.avg_period_length || 5;
  const lutealLength = preferences.luteal_phase_length || 13;
  
  // Find cycle start from next_period prediction or estimate
  const today = new Date();
  let cycleStartDate = today;
  if (prediction.next_period_start_min) {
    // Work backwards from predicted next period
    const nextPeriod = new Date(prediction.next_period_start_min);
    const daysUntilNext = differenceInDays(nextPeriod, today);
    const currentDayInCycle = avgCycleLength - daysUntilNext;
    cycleStartDate = addDays(today, -currentDayInCycle + 1);
  }
  
  // Calculate current day in cycle
  const currentDayInCycle = differenceInDays(today, cycleStartDate) + 1;
  
  // Generate 5-day forecast
  const forecast: DayForecast[] = [];
  let prevSeason = currentSeason;
  
  for (let i = 0; i < 5; i++) {
    const date = addDays(today, i);
    const dayInCycle = differenceInDays(date, cycleStartDate) + 1;
    const season = getSeasonForDate(date, cycleStartDate, avgCycleLength, periodLength, lutealLength);
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
  
  // Find next season transition
  const nextSeasonDay = forecast.find(d => d.season !== currentSeason);
  const nextSeason = nextSeasonDay?.season || currentSeason;
  const daysUntilTransition = nextSeasonDay ? differenceInDays(nextSeasonDay.date, today) : null;
  
  // Determine transition template key
  const transitionKey = daysUntilTransition !== null && daysUntilTransition <= 5
    ? `${currentSeason}-${nextSeason}`
    : null;
  const template = transitionKey ? transitionTemplates[transitionKey] : transitionTemplates[`${currentSeason}-${nextSeason}`] || transitionTemplates['herfst-winter'];
  
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
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Nu</p>
            <div className="flex items-center gap-2">
              {seasonIcons[currentSeason]}
              <span className="font-semibold">{seasonLabels[currentSeason]}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dag {currentDayInCycle > 0 ? currentDayInCycle : '?'} van je cyclus
            </p>
          </div>
          
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Daarna</p>
            <div className="flex items-center gap-2">
              {seasonIcons[nextSeason]}
              <span className="font-semibold">{seasonLabels[nextSeason]}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {daysUntilTransition !== null && daysUntilTransition > 0
                ? `Over ${daysUntilTransition} dag${daysUntilTransition > 1 ? 'en' : ''}`
                : 'Start rond ' + format(forecast[1]?.date || today, 'EEEE', { locale: nl })}
            </p>
          </div>
        </div>
        
        {/* Transition description */}
        <div className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">
            Je lichaam schakelt langzaam over richting {seasonLabels[nextSeason].toLowerCase()}.
            De komende dagen kunnen je trek en prikkelbaarheid veranderen.
          </p>
        </div>
        
        
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
