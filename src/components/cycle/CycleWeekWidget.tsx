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
import { ArrowRight, Calendar, Droplet } from 'lucide-react';

export function CycleWeekWidget() {
  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  const { data: cycles } = useCycles(1);
  const { data: bleedingLogs } = useBleedingLogs(14);

  // Don't show if onboarding not completed
  if (!preferences?.onboarding_completed) return null;

  const currentSeason = prediction?.current_season || 'onbekend';

  // Calculate day in cycle
  const getDayInCycle = (): number => {
    if (!cycles?.length) return -1;
    const avgCycleLength = prediction?.avg_cycle_length || preferences?.avg_cycle_length || 28;
    const latestCycle = cycles[0];
    const cycleStart = parseISO(latestCycle.start_date);
    const daysSinceStart = differenceInDays(new Date(), cycleStart);
    if (daysSinceStart < 0) {
      return ((daysSinceStart % avgCycleLength) + avgCycleLength) % avgCycleLength;
    }
    return daysSinceStart % avgCycleLength;
  };

  // Get predicted season for a given date
  const getPredictedSeason = (date: Date): string => {
    if (!cycles?.length) return 'onbekend';
    const avgCycleLength = prediction?.avg_cycle_length || preferences?.avg_cycle_length || 28;
    const periodLength = preferences?.avg_period_length || 5;
    const lutealLength = preferences?.luteal_phase_length || 13;
    
    const latestCycle = cycles[0];
    const cycleStart = parseISO(latestCycle.start_date);
    let daysSinceStart = differenceInDays(date, cycleStart);
    if (daysSinceStart < 0) {
      daysSinceStart = ((daysSinceStart % avgCycleLength) + avgCycleLength) % avgCycleLength;
    } else {
      daysSinceStart = daysSinceStart % avgCycleLength;
    }
    
    const ovulationDay = avgCycleLength - lutealLength;
    
    if (daysSinceStart < periodLength) return 'winter';
    if (daysSinceStart < ovulationDay - 1) return 'lente';
    if (daysSinceStart <= ovulationDay + 1) return 'zomer';
    return 'herfst';
  };

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
    
    // Ovulation - middle day
    const isOvulation = prediction?.ovulation_min && prediction?.ovulation_max && (() => {
      const min = parseISO(prediction.ovulation_min!);
      const max = parseISO(prediction.ovulation_max!);
      const mid = addDays(min, Math.floor(differenceInDays(max, min) / 2));
      return isSameDay(date, mid);
    })();
    
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

  // Season background colors (very light pastels)
  const seasonBgClasses: Record<string, string> = {
    winter: 'bg-blue-50/80 dark:bg-blue-950/30',
    lente: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    zomer: 'bg-amber-50/80 dark:bg-amber-950/30',
    herfst: 'bg-orange-50/80 dark:bg-orange-950/30',
    onbekend: 'bg-muted/50',
  };

  const dayInCycle = getDayInCycle();

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
                  {dayInCycle > 0 && <span>· Dag {dayInCycle + 1}</span>}
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {prediction?.next_period_start_min && (
              <Badge variant="outline" className="font-normal">
                <Droplet className="h-3 w-3 mr-1" />
                {format(parseISO(prediction.next_period_start_min), 'd MMM', { locale: nl })}
              </Badge>
            )}
            {preferences?.show_fertile_days && prediction?.fertile_window_start && (
              <Badge variant="outline" className="font-normal">
                Vruchtbaar {format(parseISO(prediction.fertile_window_start), 'd MMM', { locale: nl })}
              </Badge>
            )}
          </div>

          {/* 7-day calendar strip */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const { date, dateStr, isToday, bleeding, isFertile, isOvulation, isPredictedPeriod, predictedSeason } = day;
              
              // Determine border/indicator styles
              const hasBleeding = !!bleeding;
              const showPredicted = !!isPredictedPeriod;
              const showFertile = !!isFertile;

              return (
                <div
                  key={dateStr}
                  className={`
                    relative aspect-square rounded-md flex flex-col items-center justify-center text-center
                    ${seasonBgClasses[predictedSeason]}
                    ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                  `}
                >
                  {/* Menstruation indicator - left bar */}
                  {hasBleeding && (
                    <div className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-destructive" />
                  )}
                  {/* Predicted period - dashed left bar */}
                  {showPredicted && !hasBleeding && (
                    <div className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-destructive/40" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 2px, hsl(var(--destructive)) 2px, hsl(var(--destructive)) 4px)' }} />
                  )}
                  {/* Fertile indicator - ring */}
                  {showFertile && (
                    <div className="absolute inset-0.5 rounded-md border-2 border-teal-400/50" />
                  )}
                  {/* Ovulation star */}
                  {isOvulation && (
                    <div className="absolute top-0.5 right-0.5 text-amber-500 text-[10px]">★</div>
                  )}
                  
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {format(date, 'EE', { locale: nl }).charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold leading-tight">
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
