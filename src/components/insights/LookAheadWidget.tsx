import { useState } from 'react';
import { format, addDays, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { 
  Snowflake, Leaf, Sun, Wind, ChevronRight, ChevronDown, 
  Utensils, Calendar, Sparkles, Target
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLatestPrediction, useCyclePreferences, useCycles, getSeasonForDate } from '@/hooks/useCycle';

// Types
type Season = 'winter' | 'lente' | 'zomer' | 'herfst' | 'onbekend';
type RiskLevel = 'low' | 'medium' | 'high';

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

// Season badge colors 
const seasonBadgeColors: Record<Season, string> = {
  winter: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  lente: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  zomer: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  herfst: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  onbekend: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

// Season block background colors for Now/Next pills
const seasonBlockColors: Record<Season, string> = {
  winter: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800',
  lente: 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
  zomer: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
  herfst: 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800',
  onbekend: 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700',
};

// Season text colors for labels
const seasonTextColors: Record<Season, string> = {
  winter: 'text-blue-700 dark:text-blue-300',
  lente: 'text-green-700 dark:text-green-300',
  zomer: 'text-amber-700 dark:text-amber-300',
  herfst: 'text-orange-700 dark:text-orange-300',
  onbekend: 'text-gray-700 dark:text-gray-300',
};

// Risk level indicator colors
const riskColors: Record<RiskLevel, string> = {
  low: 'bg-primary/40',
  medium: 'bg-muted-foreground',
  high: 'bg-foreground',
};

// Helper function to get template key
function getTemplateKey(currentSeason: string, nextSeason: string, transitionKey: string | null): string {
  // First try transition template
  if (transitionKey) {
    const transitionKeys = ['herfst-winter', 'winter-lente', 'lente-zomer', 'zomer-herfst'];
    if (transitionKeys.includes(transitionKey)) {
      return transitionKey;
    }
    const altKey = `${currentSeason}-${nextSeason}`;
    if (transitionKeys.includes(altKey)) {
      return altKey;
    }
  }
  
  // Use season-specific template for same-season
  const seasonKeys = ['winter', 'lente', 'zomer', 'herfst'];
  if (seasonKeys.includes(currentSeason)) {
    return currentSeason;
  }
  
  // Fallback to default
  return 'default';
}

// Calculate risk levels based on season and transition
function calculateRiskLevels(season: Season, isTransition: boolean): { sleep: RiskLevel; cravings: RiskLevel; unrest: RiskLevel } {
  const baseRisks: Record<Season, { sleep: RiskLevel; cravings: RiskLevel; unrest: RiskLevel }> = {
    winter: { sleep: 'medium', cravings: 'low', unrest: 'low' },
    lente: { sleep: 'low', cravings: 'low', unrest: 'low' },
    zomer: { sleep: 'low', cravings: 'low', unrest: 'medium' },
    herfst: { sleep: 'high', cravings: 'high', unrest: 'high' },
    onbekend: { sleep: 'medium', cravings: 'medium', unrest: 'medium' },
  };

  const risks = baseRisks[season];
  
  // Increase risks during transition days
  if (isTransition) {
    return {
      sleep: risks.sleep === 'low' ? 'medium' : 'high',
      cravings: risks.cravings === 'low' ? 'medium' : 'high',
      unrest: risks.unrest === 'low' ? 'medium' : 'high',
    };
  }
  
  return risks;
}

function RiskDots({ level }: { level: RiskLevel }) {
  return (
    <div className="flex gap-0.5">
      <div className={`w-1.5 h-1.5 rounded-full ${riskColors[level]}`} />
      <div className={`w-1.5 h-1.5 rounded-full ${level === 'medium' || level === 'high' ? riskColors[level] : 'bg-muted'}`} />
      <div className={`w-1.5 h-1.5 rounded-full ${level === 'high' ? riskColors[level] : 'bg-muted'}`} />
    </div>
  );
}

function DayCard({ day, onClick }: { day: DayForecast; onClick: () => void }) {
  const { t } = useTranslation();
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
          <span className="text-[9px] text-muted-foreground">{t('lookAhead.riskLabels.sleep')}</span>
          <RiskDots level={day.sleep} />
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-[9px] text-muted-foreground">{t('lookAhead.riskLabels.cravings')}</span>
          <RiskDots level={day.cravings} />
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-[9px] text-muted-foreground">{t('lookAhead.riskLabels.unrest')}</span>
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
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('nl') ? nl : enUS;
  const daysUntilTransition = transitionKey ? 2 : null;
  
  const riskLevelLabel = (level: RiskLevel) => t(`lookAhead.riskLevels.${level}`);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {format(day.date, 'EEEE d MMMM', { locale: dateLocale })}
            <Badge className={seasonBadgeColors[day.season]}>
              {t(`seasons.${day.season}`)}
            </Badge>
          </DialogTitle>
          {transitionKey && (
            <p className="text-sm text-muted-foreground">
              {t('lookAhead.transitionIn', { season: t(`seasons.${nextSeason}`), days: daysUntilTransition })}
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {/* Risk factors */}
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-sm font-medium mb-2">{t('lookAhead.riskFactorsToday')}</p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-muted-foreground">{t('lookAhead.riskLabels.sleep')}</p>
                <Badge variant="outline" className="mt-1">{riskLevelLabel(day.sleep)}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">{t('lookAhead.riskLabels.cravings')}</p>
                <Badge variant="outline" className="mt-1">{riskLevelLabel(day.cravings)}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">{t('lookAhead.riskLabels.unrest')}</p>
                <Badge variant="outline" className="mt-1">{riskLevelLabel(day.unrest)}</Badge>
              </div>
            </div>
          </div>
          
          {/* Mini plan for this day */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              {t('lookAhead.miniPlanTitle')}
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {t('lookAhead.miniPlan.proteinBreakfast')}
              </li>
              {day.cravings !== 'low' && (
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {t('lookAhead.miniPlan.stopCaffeine')}
                </li>
              )}
              {day.sleep !== 'low' && (
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {t('lookAhead.miniPlan.simpleDinner')}
                </li>
              )}
            </ul>
          </div>
          
          {/* Confidence */}
          <div className="p-3 rounded-lg bg-muted/20 text-xs text-muted-foreground">
            <p className="font-medium">{t('lookAhead.confidence.title')}</p>
            <p>{t('lookAhead.confidence.description')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LookAheadWidget() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('nl') ? nl : enUS;
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
  
  // Use the actual cycle start date from cycles table
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
  
  // Use prediction.current_season consistently across all pages
  // This comes from calculatePhaseAndPredictions() which uses actual bleeding logs
  const currentSeason: Season = (prediction.current_season as Season) || 'onbekend';
  
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
      dayName: format(date, 'EEE', { locale: dateLocale }),
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
  
  // Calculate days until next season based on current day in cycle
  let calculatedNextSeason: Season = currentSeason;
  let calculatedDaysUntil: number | null = null;
  
  if (currentDayInCycle > 0 && currentDayInCycle <= avgCycleLength) {
    if (currentSeason === 'winter') {
      calculatedNextSeason = 'lente';
      calculatedDaysUntil = Math.max(0, avgPeriodLength - currentDayInCycle + 1);
    } else if (currentSeason === 'lente') {
      calculatedNextSeason = 'zomer';
      calculatedDaysUntil = Math.max(0, follicularEnd - currentDayInCycle + 1);
    } else if (currentSeason === 'zomer') {
      calculatedNextSeason = 'herfst';
      calculatedDaysUntil = Math.max(0, ovulationEnd - currentDayInCycle + 1);
    } else if (currentSeason === 'herfst') {
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
  const templateKey = getTemplateKey(currentSeason, nextSeason, transitionKey);
  
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Get translated template content
  const quote = t(`lookAhead.templates.${templateKey}.quote`);
  const feelings = t(`lookAhead.templates.${templateKey}.feelings`, { returnObjects: true }) as string[];
  const focus = t(`lookAhead.templates.${templateKey}.focus`, { returnObjects: true }) as string[];
  const eatingTips = t(`lookAhead.templates.${templateKey}.eatingTips`, { returnObjects: true }) as { action: string; examples: string[] }[];
  const planningTips = t(`lookAhead.templates.${templateKey}.planningTips`, { returnObjects: true }) as { action: string; details: string }[];

  return (
    <Card className="rounded-2xl overflow-hidden border shadow-soft">
      <CardContent className="p-0">
        {/* Season Quote Header */}
        <div className="p-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b">
          <p className="text-sm font-medium text-center text-foreground">
            {quote}
          </p>
        </div>
        
        {/* Season Pills */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-xl ${seasonBlockColors[currentSeason]}`}>
            <p className="text-xs text-muted-foreground mb-1">{t('lookAhead.now')}</p>
            <div className={`flex items-center gap-2 ${seasonTextColors[currentSeason]}`}>
              {seasonIcons[currentSeason]}
              <span className="font-semibold">{t(`seasons.${currentSeason}`)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('lookAhead.dayOfCycle', { day: currentDayInCycle > 0 ? currentDayInCycle : '?' })}
            </p>
          </div>
          
          <div className={`p-3 rounded-xl ${seasonBlockColors[nextSeason]}`}>
            <p className="text-xs text-muted-foreground mb-1">{t('lookAhead.next')}</p>
            <div className={`flex items-center gap-2 ${seasonTextColors[nextSeason]}`}>
              {seasonIcons[nextSeason]}
              <span className="font-semibold">{t(`seasons.${nextSeason}`)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {daysUntilTransition !== null && daysUntilTransition > 0
                ? t('lookAhead.inDays', { count: daysUntilTransition })
                : t('lookAhead.soon')}
            </p>
          </div>
        </div>
        
        {/* Transition description - only show if transitioning to different season */}
        {nextSeason !== currentSeason && (
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              {t('lookAhead.transitionDescription', { season: t(`seasons.${nextSeason}`).toLowerCase() })}
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
              {t('lookAhead.sections.whatYouMightNotice')}
            </span>
            {expandedSection === 'feelings' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {expandedSection === 'feelings' && (
            <div className="px-4 pb-4 space-y-2">
              {Array.isArray(feelings) && feelings.map((feeling, i) => (
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
              {t('lookAhead.sections.focusNext5Days')}
            </span>
            {expandedSection === 'focus' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {expandedSection === 'focus' && (
            <div className="px-4 pb-4 space-y-2">
              {Array.isArray(focus) && focus.map((f, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5">
                  <span className="text-primary font-bold">{i + 1}</span>
                  <p className="text-sm">{f}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Action plan */}
        <div className="border-t p-4">
          <p className="text-sm font-semibold mb-3">📋 {t('lookAhead.sections.actionPlan')}</p>
          
          {/* Eating block */}
          <div className="mb-4">
            <button
              onClick={() => toggleSection('eating')}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                {t('lookAhead.sections.eating')}
              </span>
              {expandedSection === 'eating' ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {expandedSection === 'eating' && (
              <div className="mt-2 space-y-3 pl-6">
                {Array.isArray(eatingTips) && eatingTips.map((tip, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium">{tip.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('lookAhead.examples')}: {tip.examples.join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Planning block */}
          <div className="mb-4">
            <button
              onClick={() => toggleSection('planning')}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('lookAhead.sections.planning')}
              </span>
              {expandedSection === 'planning' ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {expandedSection === 'planning' && (
              <div className="mt-2 space-y-3 pl-6">
                {Array.isArray(planningTips) && planningTips.map((tip, i) => (
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
