import { format, addDays, isSameDay, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Droplet, Sparkles } from 'lucide-react';
import { CyclePrediction, CyclePreferences, BleedingLog, Cycle, seasonLabels } from '@/hooks/useCycle';

interface CycleCalendarProps {
  prediction: Omit<CyclePrediction, 'id' | 'owner_id' | 'generated_at'> | CyclePrediction;
  preferences: CyclePreferences | null;
  cycles: Cycle[];
  bleedingLogs: BleedingLog[];
  onDayClick: (dateStr: string) => void;
}

export function CycleCalendar({ prediction, preferences, cycles, bleedingLogs, onDayClick }: CycleCalendarProps) {
  const avgCycleLength = prediction.avg_cycle_length || preferences?.avg_cycle_length || 28;
  const periodLength = preferences?.avg_period_length || 5;
  const lutealLength = preferences?.luteal_phase_length || 13;
  const ovulationDayInCycle = avgCycleLength - lutealLength;

  // Get the actual day number in cycle for a given date (not using modulo for display)
  const getDayInCycle = (date: Date): number => {
    if (!cycles?.length) return -1;
    const latestCycle = cycles[0];
    const cycleStart = parseISO(latestCycle.start_date);
    return differenceInDays(date, cycleStart);
  };

  // Get predicted season based on day in cycle - handles multiple cycles
  const getPredictedSeason = (date: Date): string => {
    const dayInCycle = getDayInCycle(date);
    if (dayInCycle < 0) return 'onbekend';
    
    // Normalize to position within a cycle
    const normalizedDay = dayInCycle % avgCycleLength;
    
    if (normalizedDay < periodLength) return 'winter';
    if (normalizedDay < ovulationDayInCycle - 1) return 'lente';
    if (normalizedDay <= ovulationDayInCycle + 1) return 'zomer';
    return 'herfst';
  };

  // Ovulation day (single day in the middle of the window)
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

  // Season background colors - distinct but soft pastels
  const seasonBgClasses: Record<string, string> = {
    winter: 'bg-sky-100/90 dark:bg-sky-900/40',
    lente: 'bg-emerald-100/90 dark:bg-emerald-900/40',
    zomer: 'bg-amber-100/90 dark:bg-amber-900/40',
    herfst: 'bg-orange-100/90 dark:bg-orange-900/40',
    onbekend: 'bg-muted/50',
  };

  // Group days by season for rendering
  const groupedBySeason: { season: string; days: typeof calendarDays }[] = [];
  let currentGroup: { season: string; days: typeof calendarDays } | null = null;
  
  for (const day of calendarDays) {
    if (!currentGroup || currentGroup.season !== day.predictedSeason) {
      if (currentGroup) groupedBySeason.push(currentGroup);
      currentGroup = { season: day.predictedSeason, days: [day] };
    } else {
      currentGroup.days.push(day);
    }
  }
  if (currentGroup) groupedBySeason.push(currentGroup);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Cyclusagenda
        </CardTitle>
        
        {/* Quick date chips */}
        <div className="flex flex-wrap gap-2 mt-2">
          {prediction.next_period_start_min && (
            <Badge variant="outline" className="font-normal gap-1">
              <Droplet className="h-3 w-3" />
              Menstruatie {format(parseISO(prediction.next_period_start_min), 'd MMM', { locale: nl })}
            </Badge>
          )}
          {preferences?.show_fertile_days && prediction.fertile_window_start && prediction.fertile_window_end && (
            <Badge variant="outline" className="font-normal">
              Vruchtbaar {format(parseISO(prediction.fertile_window_start), 'd MMM', { locale: nl })} - {format(parseISO(prediction.fertile_window_end), 'd MMM', { locale: nl })}
            </Badge>
          )}
          {preferences?.show_fertile_days && ovulationDateStr && (
            <Badge variant="outline" className="font-normal gap-1">
              <Sparkles className="h-3 w-3" />
              Ovulatie {format(parseISO(ovulationDateStr), 'd MMM', { locale: nl })}
            </Badge>
          )}
        </div>

        {/* Two-part legend - compact */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-sky-100 dark:bg-sky-900 border border-border/50" /><span>Winter</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-100 dark:bg-emerald-900 border border-border/50" /><span>Lente</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-amber-100 dark:bg-amber-900 border border-border/50" /><span>Zomer</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-orange-100 dark:bg-orange-900 border border-border/50" /><span>Herfst</span></div>
          <div className="flex items-center gap-1"><span className="text-destructive">●</span><span>Menstruatie</span></div>
          <div className="flex items-center gap-1"><span className="text-destructive/50">○</span><span>Verwacht</span></div>
          {preferences?.show_fertile_days && (
            <>
              <div className="flex items-center gap-1"><span className="text-teal-500">◆</span><span>Vruchtbaar</span></div>
              <div className="flex items-center gap-1"><span className="text-amber-500">★</span><span>Ovulatie</span></div>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {groupedBySeason.map((group, groupIdx) => (
          <div key={`${group.season}-${groupIdx}`} className={`rounded-xl p-2 ${seasonBgClasses[group.season]}`}>
            {/* Season header */}
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span className="text-sm font-semibold">{seasonLabels[group.season]}</span>
              <span className="text-xs text-muted-foreground">
                {format(group.days[0].date, 'd MMM', { locale: nl })} - {format(group.days[group.days.length - 1].date, 'd MMM', { locale: nl })}
              </span>
            </div>
            
            {/* 7-column grid - smaller gaps, larger text */}
            <div className="grid grid-cols-7 gap-0.5">
              {group.days.map((day) => {
                const { date, dateStr, isToday, bleeding, isFertile, isOvulation, isPredictedPeriod } = day;
                
                const hasBleeding = !!bleeding;
                const showPredicted = !!isPredictedPeriod;
                const showFertile = !!isFertile;

                return (
                  <button
                    key={dateStr}
                    onClick={() => onDayClick(dateStr)}
                    className={`
                      relative min-h-[38px] rounded-md bg-background/70 dark:bg-background/30
                      flex flex-col items-center justify-center text-center p-0.5
                      transition-all hover:bg-background/90 dark:hover:bg-background/50
                      ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent' : ''}
                    `}
                  >
                    {/* Day name - smaller */}
                    <span className="text-[9px] text-muted-foreground leading-none">
                      {format(date, 'EEEEEE', { locale: nl })}
                    </span>
                    {/* Date - larger and bold */}
                    <span className="text-lg font-bold leading-tight">
                      {format(date, 'd')}
                    </span>
                    
                    {/* Event indicators - small icons below the date */}
                    <div className="flex items-center gap-0.5 h-3">
                      {hasBleeding && <span className="text-destructive text-[10px]">●</span>}
                      {showPredicted && !hasBleeding && <span className="text-destructive/50 text-[10px]">○</span>}
                      {showFertile && <span className="text-teal-500 text-[8px]">◆</span>}
                      {isOvulation && <span className="text-amber-500 text-[10px]">★</span>}
                    </div>
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
