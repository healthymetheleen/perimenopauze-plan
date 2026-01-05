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
  // Calculate day in cycle
  const getDayInCycle = (date: Date): number => {
    const avgCycleLength = prediction.avg_cycle_length || preferences?.avg_cycle_length || 28;
    if (!cycles?.length) return -1;
    const latestCycle = cycles[0];
    const cycleStart = parseISO(latestCycle.start_date);
    const daysSinceStart = differenceInDays(date, cycleStart);
    if (daysSinceStart < 0) {
      return ((daysSinceStart % avgCycleLength) + avgCycleLength) % avgCycleLength;
    }
    return daysSinceStart % avgCycleLength;
  };

  // Get predicted season for a given date
  const getPredictedSeason = (date: Date): string => {
    const avgCycleLength = prediction.avg_cycle_length || preferences?.avg_cycle_length || 28;
    const periodLength = preferences?.avg_period_length || 5;
    const lutealLength = preferences?.luteal_phase_length || 13;
    
    const dayInCycle = getDayInCycle(date);
    if (dayInCycle < 0) return 'onbekend';
    
    const ovulationDay = avgCycleLength - lutealLength;
    
    if (dayInCycle < periodLength) return 'winter';
    if (dayInCycle < ovulationDay - 1) return 'lente';
    if (dayInCycle <= ovulationDay + 1) return 'zomer';
    return 'herfst';
  };

  // Ovulation day (single day in the middle of the window)
  const ovulationDay = (() => {
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
      isOvulation: dateStr === ovulationDay,
      isPredictedPeriod: isPredictedPeriod && !bleeding,
      predictedSeason: getPredictedSeason(date),
    };
  });

  // Season background colors - very light pastels so events pop
  const seasonBgClasses: Record<string, string> = {
    winter: 'bg-blue-50/90 dark:bg-blue-950/40',
    lente: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    zomer: 'bg-amber-50/90 dark:bg-amber-950/40',
    herfst: 'bg-orange-50/90 dark:bg-orange-950/40',
    onbekend: 'bg-muted/30',
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
          {preferences?.show_fertile_days && ovulationDay && (
            <Badge variant="outline" className="font-normal gap-1">
              <Sparkles className="h-3 w-3" />
              Ovulatie {format(parseISO(ovulationDay), 'd MMM', { locale: nl })}
            </Badge>
          )}
        </div>

        {/* Two-part legend */}
        <div className="space-y-2 mt-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-3">
            <span className="font-medium text-foreground">Seizoen:</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-50 dark:bg-blue-950 border border-border/50" /><span>Winter</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-50 dark:bg-emerald-950 border border-border/50" /><span>Lente</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-50 dark:bg-amber-950 border border-border/50" /><span>Zomer</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-50 dark:bg-orange-950 border border-border/50" /><span>Herfst</span></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="font-medium text-foreground">Events:</span>
            <div className="flex items-center gap-1"><div className="w-1 h-3 rounded-full bg-destructive" /><span>Menstruatie</span></div>
            <div className="flex items-center gap-1"><div className="w-1 h-3 rounded-full bg-destructive/40" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 2px, hsl(var(--destructive)/0.4) 2px, hsl(var(--destructive)/0.4) 4px)' }} /><span>Verwacht</span></div>
            {preferences?.show_fertile_days && (
              <>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-teal-400" /><span>Vruchtbaar</span></div>
                <div className="flex items-center gap-1"><span className="text-amber-500">★</span><span>Ovulatie</span></div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {groupedBySeason.map((group, groupIdx) => (
          <div key={`${group.season}-${groupIdx}`} className={`rounded-xl p-3 ${seasonBgClasses[group.season]}`}>
            {/* Season header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">{seasonLabels[group.season]}</span>
              <span className="text-xs text-muted-foreground">
                {format(group.days[0].date, 'd MMM', { locale: nl })} - {format(group.days[group.days.length - 1].date, 'd MMM', { locale: nl })}
              </span>
            </div>
            
            {/* 7-column grid */}
            <div className="grid grid-cols-7 gap-1">
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
                      relative aspect-square min-h-[40px] rounded-lg bg-background/60 dark:bg-background/20
                      flex flex-col items-center justify-center text-center
                      transition-all hover:bg-background/80 dark:hover:bg-background/40
                      ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent' : ''}
                    `}
                  >
                    {/* Menstruation - red left bar */}
                    {hasBleeding && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-destructive" />
                    )}
                    {/* Predicted period - dashed red left bar */}
                    {showPredicted && !hasBleeding && (
                      <div 
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full"
                        style={{ 
                          background: 'repeating-linear-gradient(to bottom, hsl(var(--destructive)/0.5), hsl(var(--destructive)/0.5) 3px, transparent 3px, transparent 6px)'
                        }} 
                      />
                    )}
                    {/* Fertile - teal ring around tile */}
                    {showFertile && (
                      <div className="absolute inset-0.5 rounded-lg border-2 border-teal-400/60" />
                    )}
                    {/* Ovulation - star top right */}
                    {isOvulation && (
                      <div className="absolute top-0.5 right-1 text-amber-500 text-xs font-bold">★</div>
                    )}
                    
                    {/* Day content */}
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {format(date, 'EE', { locale: nl }).substring(0, 2)}
                    </span>
                    <span className="text-base font-bold leading-tight">
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
