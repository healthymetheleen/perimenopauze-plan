import { useState } from 'react';
import { format, addDays, isSameDay, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar, Droplet, Sparkles, Snowflake, Leaf, Sun, Wind } from 'lucide-react';
import { CyclePrediction, CyclePreferences, BleedingLog, Cycle, seasonLabels } from '@/hooks/useCycle';

interface CycleCalendarProps {
  prediction: Omit<CyclePrediction, 'id' | 'owner_id' | 'generated_at'> | CyclePrediction;
  preferences: CyclePreferences | null;
  cycles: Cycle[];
  bleedingLogs: BleedingLog[];
  onDayClick: (dateStr: string) => void;
}

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-4 w-4" />,
  lente: <Leaf className="h-4 w-4" />,
  zomer: <Sun className="h-4 w-4" />,
  herfst: <Wind className="h-4 w-4" />,
  onbekend: <Calendar className="h-4 w-4" />,
};

export function CycleCalendar({ prediction, preferences, cycles, bleedingLogs, onDayClick }: CycleCalendarProps) {
  const [showSeasons, setShowSeasons] = useState(true);
  const [showMenstruation, setShowMenstruation] = useState(true);
  const [showFertile, setShowFertile] = useState(preferences?.show_fertile_days ?? true);

  const avgCycleLength = prediction.avg_cycle_length || preferences?.avg_cycle_length || 28;
  const periodLength = preferences?.avg_period_length || 5;
  const lutealLength = preferences?.luteal_phase_length || 13;
  const ovulationDayInCycle = avgCycleLength - lutealLength;

  const getDayInCycle = (date: Date): number => {
    if (!cycles?.length) return -1;
    const latestCycle = cycles[0];
    const cycleStart = parseISO(latestCycle.start_date);
    return differenceInDays(date, cycleStart);
  };

  const getPredictedSeason = (date: Date): string => {
    const dayInCycle = getDayInCycle(date);
    if (dayInCycle < 0) return 'onbekend';
    const normalizedDay = dayInCycle % avgCycleLength;
    if (normalizedDay < periodLength) return 'winter';
    if (normalizedDay < ovulationDayInCycle - 1) return 'lente';
    if (normalizedDay <= ovulationDayInCycle + 1) return 'zomer';
    return 'herfst';
  };

  const ovulationDateStr = (() => {
    if (!prediction.ovulation_min || !prediction.ovulation_max) return undefined;
    const min = parseISO(prediction.ovulation_min);
    const max = parseISO(prediction.ovulation_max);
    const mid = addDays(min, Math.floor(differenceInDays(max, min) / 2));
    return format(mid, 'yyyy-MM-dd');
  })();

  // Generate 35 days of calendar data
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const date = addDays(new Date(), i - 7);
    const dateStr = format(date, 'yyyy-MM-dd');
    const bleeding = bleedingLogs?.find(l => l.log_date === dateStr);
    
    const isFertile = preferences?.show_fertile_days && 
      prediction.fertile_window_start && 
      prediction.fertile_window_end &&
      isWithinInterval(date, {
        start: parseISO(prediction.fertile_window_start),
        end: parseISO(prediction.fertile_window_end),
      });
    
    const isPredictedPeriod = prediction.next_period_start_min && 
      prediction.next_period_start_max &&
      isWithinInterval(date, {
        start: parseISO(prediction.next_period_start_min),
        end: addDays(parseISO(prediction.next_period_start_max), 4),
      });

    return {
      date,
      dateStr,
      isToday: isSameDay(date, new Date()),
      bleeding: bleeding?.intensity,
      isFertile,
      isOvulation: dateStr === ovulationDateStr,
      isPredictedPeriod: isPredictedPeriod && !bleeding,
      predictedSeason: getPredictedSeason(date),
    };
  });

  // Season colors for tiles
  const seasonTileClasses: Record<string, string> = {
    winter: 'bg-sky-100 dark:bg-sky-900/60',
    lente: 'bg-emerald-100 dark:bg-emerald-900/60',
    zomer: 'bg-amber-100 dark:bg-amber-900/60',
    herfst: 'bg-orange-100 dark:bg-orange-900/60',
    onbekend: 'bg-muted',
  };

  // Group days by season to show headers
  const seasonGroups: { season: string; startIdx: number; endIdx: number; startDate: Date; endDate: Date }[] = [];
  let currentSeason = calendarDays[0]?.predictedSeason || 'onbekend';
  let startIdx = 0;
  
  calendarDays.forEach((day, idx) => {
    if (day.predictedSeason !== currentSeason || idx === calendarDays.length - 1) {
      const endIdx = idx === calendarDays.length - 1 ? idx : idx - 1;
      seasonGroups.push({
        season: currentSeason,
        startIdx,
        endIdx,
        startDate: calendarDays[startIdx].date,
        endDate: calendarDays[endIdx].date,
      });
      currentSeason = day.predictedSeason;
      startIdx = idx;
    }
  });

  // Season panel backgrounds
  const seasonPanelClasses: Record<string, string> = {
    winter: 'bg-sky-50 dark:bg-sky-950/30',
    lente: 'bg-emerald-50 dark:bg-emerald-950/30',
    zomer: 'bg-amber-50 dark:bg-amber-950/30',
    herfst: 'bg-orange-50 dark:bg-orange-950/30',
    onbekend: 'bg-muted/20',
  };

  const seasonTextClasses: Record<string, string> = {
    winter: 'text-sky-700 dark:text-sky-300',
    lente: 'text-emerald-700 dark:text-emerald-300',
    zomer: 'text-amber-700 dark:text-amber-300',
    herfst: 'text-orange-700 dark:text-orange-300',
    onbekend: 'text-muted-foreground',
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Cyclusagenda
        </CardTitle>
        
        {/* Toggles */}
        <div className="flex flex-wrap gap-4 mt-3">
          <div className="flex items-center gap-2">
            <Switch id="show-seasons" checked={showSeasons} onCheckedChange={setShowSeasons} />
            <Label htmlFor="show-seasons" className="text-sm">Seizoenen</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="show-menstruation" checked={showMenstruation} onCheckedChange={setShowMenstruation} />
            <Label htmlFor="show-menstruation" className="text-sm">Menstruatie</Label>
          </div>
          {preferences?.show_fertile_days && (
            <div className="flex items-center gap-2">
              <Switch id="show-fertile" checked={showFertile} onCheckedChange={setShowFertile} />
              <Label htmlFor="show-fertile" className="text-sm">Vruchtbaarheid</Label>
            </div>
          )}
        </div>

        {/* Quick date chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {prediction.next_period_start_min && (
            <Badge variant="outline" className="font-normal gap-1">
              <Droplet className="h-3 w-3" />
              {format(parseISO(prediction.next_period_start_min), 'd MMM', { locale: nl })}
            </Badge>
          )}
          {preferences?.show_fertile_days && prediction.fertile_window_start && (
            <Badge variant="outline" className="font-normal">
              Vruchtbaar {format(parseISO(prediction.fertile_window_start), 'd MMM', { locale: nl })}
            </Badge>
          )}
          {preferences?.show_fertile_days && ovulationDateStr && (
            <Badge variant="outline" className="font-normal gap-1">
              <Sparkles className="h-3 w-3" />
              {format(parseISO(ovulationDateStr), 'd MMM', { locale: nl })}
            </Badge>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><span className="text-rose-500">●</span> Menstruatie</div>
          <div className="flex items-center gap-1"><span className="text-rose-300">○</span> Verwacht</div>
          {preferences?.show_fertile_days && (
            <>
              <div className="flex items-center gap-1"><span className="text-emerald-500">●</span> Vruchtbaar</div>
              <div className="flex items-center gap-1"><span className="text-amber-500">★</span> Ovulatie</div>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {seasonGroups.map((group, groupIdx) => (
          <div key={`${group.season}-${groupIdx}`} className={`rounded-xl p-3 ${showSeasons ? seasonPanelClasses[group.season] : 'bg-muted/20'}`}>
            {/* Season header */}
            {showSeasons && (
              <div className={`flex items-center gap-2 mb-2 ${seasonTextClasses[group.season]}`}>
                {seasonIcons[group.season]}
                <span className="text-sm font-semibold">{seasonLabels[group.season]}</span>
                <span className="text-xs opacity-70">
                  {format(group.startDate, 'd MMM', { locale: nl })} - {format(group.endDate, 'd MMM', { locale: nl })}
                </span>
              </div>
            )}
            
            {/* 7-column grid for this season's days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.slice(group.startIdx, group.endIdx + 1).map((day) => {
                const { date, dateStr, isToday, bleeding, isFertile, isOvulation, isPredictedPeriod, predictedSeason } = day;
                
                const hasBleeding = !!bleeding && showMenstruation;
                const showPredicted = !!isPredictedPeriod && showMenstruation;
                const showFertileDay = !!isFertile && showFertile;
                const showOvulation = !!isOvulation && showFertile;

                // Determine tile color based on events
                let tileClass = showSeasons ? seasonTileClasses[predictedSeason] : 'bg-background';
                
                if (hasBleeding) {
                  tileClass = 'bg-rose-400 dark:bg-rose-600 text-white';
                } else if (showPredicted) {
                  tileClass = 'bg-rose-200 dark:bg-rose-800/60';
                } else if (showFertileDay) {
                  tileClass = 'bg-emerald-300 dark:bg-emerald-700';
                }

                return (
                  <button
                    key={dateStr}
                    onClick={() => onDayClick(dateStr)}
                    className={`
                      relative min-h-[52px] rounded-lg
                      flex flex-col items-center justify-center text-center p-1
                      transition-all hover:opacity-80
                      ${tileClass}
                      ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                    `}
                  >
                    {/* Ovulation star */}
                    {showOvulation && (
                      <span className="absolute top-1 right-1 text-amber-500 text-sm">★</span>
                    )}
                    
                    {/* Day name */}
                    <span className={`text-[10px] leading-none ${hasBleeding ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {format(date, 'EE', { locale: nl })}
                    </span>
                    {/* Date - large and bold */}
                    <span className={`text-xl font-bold leading-tight ${hasBleeding ? 'text-white' : ''}`}>
                      {format(date, 'd')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
