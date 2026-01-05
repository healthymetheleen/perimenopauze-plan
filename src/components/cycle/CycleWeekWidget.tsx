import { format, addDays, isSameDay, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useLatestPrediction,
  useCyclePreferences,
  useCycles,
  useBleedingLogs,
  seasonLabels,
} from '@/hooks/useCycle';
import { ArrowRight, Calendar, Droplet, Sparkles } from 'lucide-react';

export function CycleWeekWidget() {
  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  const { data: cycles } = useCycles(1);
  const { data: bleedingLogs } = useBleedingLogs(14);

  // Don't show if onboarding not completed
  if (!preferences?.onboarding_completed) return null;

  const avgCycleLength = prediction?.avg_cycle_length || preferences?.avg_cycle_length || 28;
  const periodLength = preferences?.avg_period_length || 5;
  const lutealLength = preferences?.luteal_phase_length || 13;
  const ovulationDayInCycle = avgCycleLength - lutealLength;

  const currentSeason = prediction?.current_season || 'onbekend';

  // Calculate day in cycle for a given date
  const getDayInCycle = (date: Date): number => {
    if (!cycles?.length) return -1;
    const latestCycle = cycles[0];
    const cycleStart = parseISO(latestCycle.start_date);
    return differenceInDays(date, cycleStart);
  };

  // Get predicted season based on day in cycle
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

  // Ovulation - middle day of ovulation window
  const ovulationDateStr = (() => {
    if (!prediction?.ovulation_min || !prediction?.ovulation_max) return undefined;
    const min = parseISO(prediction.ovulation_min);
    const max = parseISO(prediction.ovulation_max);
    const mid = addDays(min, Math.floor(differenceInDays(max, min) / 2));
    return format(mid, 'yyyy-MM-dd');
  })();

  // Generate 7-day calendar (today + 6 days)
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const bleeding = bleedingLogs?.find(l => l.log_date === dateStr);
    
    const isFertile = preferences?.show_fertile_days && 
      prediction?.fertile_window_start && 
      prediction?.fertile_window_end &&
      isWithinInterval(date, {
        start: parseISO(prediction.fertile_window_start),
        end: parseISO(prediction.fertile_window_end),
      });
    
    const isOvulation = dateStr === ovulationDateStr && preferences?.show_fertile_days;
    
    const isPredictedPeriod = prediction?.next_period_start_min && 
      prediction?.next_period_start_max &&
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
      isOvulation,
      isPredictedPeriod: isPredictedPeriod && !bleeding,
      predictedSeason: getPredictedSeason(date),
    };
  });

  // Season tile colors
  const seasonTileClasses: Record<string, string> = {
    winter: 'bg-sky-100 dark:bg-sky-900/60',
    lente: 'bg-emerald-100 dark:bg-emerald-900/60',
    zomer: 'bg-amber-100 dark:bg-amber-900/60',
    herfst: 'bg-orange-100 dark:bg-orange-900/60',
    onbekend: 'bg-muted',
  };

  const dayInCycle = getDayInCycle(new Date());

  return (
    <Link to="/cyclus">
      <Card className="glass rounded-2xl hover:shadow-soft transition-all">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted/50">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Cyclus</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{seasonLabels[currentSeason]}</span>
                  {dayInCycle >= 0 && <span>· Dag {dayInCycle + 1}</span>}
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {prediction?.next_period_start_min && (
              <Badge variant="outline" className="font-normal gap-1">
                <Droplet className="h-3 w-3" />
                {format(parseISO(prediction.next_period_start_min), 'd MMM', { locale: nl })}
              </Badge>
            )}
            {preferences?.show_fertile_days && prediction?.fertile_window_start && (
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

          {/* 7-day calendar strip */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const { date, dateStr, isToday, bleeding, isFertile, isOvulation, isPredictedPeriod, predictedSeason } = day;
              
              const hasBleeding = !!bleeding;
              const showPredicted = !!isPredictedPeriod;
              const showFertile = !!isFertile;

              // Determine tile color based on events (same style as calendar)
              let tileClass = seasonTileClasses[predictedSeason];
              
              if (hasBleeding) {
                tileClass = 'bg-rose-400 dark:bg-rose-600 text-white';
              } else if (showPredicted) {
                tileClass = 'bg-rose-200 dark:bg-rose-800/60';
              } else if (showFertile) {
                tileClass = 'bg-emerald-300 dark:bg-emerald-700';
              }

              return (
                <div
                  key={dateStr}
                  className={`
                    relative min-h-[44px] rounded-md flex flex-col items-center justify-center text-center
                    ${tileClass}
                    ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                  `}
                >
                  {/* Ovulation star */}
                  {isOvulation && (
                    <span className="absolute top-0.5 right-0.5 text-amber-500 text-xs">★</span>
                  )}
                  
                  <span className={`text-[10px] leading-tight ${hasBleeding ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {format(date, 'EE', { locale: nl }).substring(0, 2)}
                  </span>
                  <span className={`text-lg font-bold leading-tight ${hasBleeding ? 'text-white' : ''}`}>
                    {format(date, 'd')}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
