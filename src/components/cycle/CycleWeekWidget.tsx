import {
  addDays,
  differenceInDays,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useLatestPrediction,
  useCyclePreferences,
  useCycles,
  useBleedingLogs,
  getSeasonForDate,
} from '@/hooks/useCycle';
import { ArrowRight, Calendar } from 'lucide-react';

type SeasonKey = 'winter' | 'lente' | 'zomer' | 'herfst' | 'onbekend';

export function CycleWeekWidget() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'nl' ? nl : enUS;
  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  const { data: cycles } = useCycles(1);
  const { data: bleedingLogs } = useBleedingLogs(14);

  if (!preferences?.onboarding_completed) return null;

  const avgCycleLength = prediction?.avg_cycle_length || preferences?.avg_cycle_length || 28;
  const periodLength = preferences?.avg_period_length || 5;
  const lutealLength = preferences?.luteal_phase_length || 13;

  const latestCycleStart = cycles?.[0]?.start_date ? startOfDay(parseISO(cycles[0].start_date)) : null;

  const predictedPeriodMin = prediction?.next_period_start_min ? startOfDay(parseISO(prediction.next_period_start_min)) : null;
  const predictedPeriodMax = prediction?.next_period_start_max ? startOfDay(parseISO(prediction.next_period_start_max)) : null;

  const getPredictedSeason = (date: Date): SeasonKey => {
    if (!latestCycleStart) return 'onbekend';
    return getSeasonForDate(date, latestCycleStart, avgCycleLength, periodLength, lutealLength);
  };

  const ovulationDateStr = (() => {
    if (!prediction?.ovulation_min || !prediction?.ovulation_max) return undefined;
    const min = startOfDay(parseISO(prediction.ovulation_min));
    const max = startOfDay(parseISO(prediction.ovulation_max));
    const mid = addDays(min, Math.floor(differenceInDays(max, min) / 2));
    return format(mid, 'yyyy-MM-dd');
  })();

  const today0 = startOfDay(new Date());
  const currentSeason = prediction?.current_season || 'onbekend';

  // Day in cycle (for header)
  const dayInCycle = latestCycleStart ? differenceInDays(today0, latestCycleStart) + 1 : -1;

  const seasonTileClass: Record<SeasonKey, string> = {
    winter: 'season-surface-winter',
    lente: 'season-surface-lente',
    zomer: 'season-surface-zomer',
    herfst: 'season-surface-herfst',
    onbekend: 'season-surface-onbekend',
  };

  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today0, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const bleeding = bleedingLogs?.find((l) => l.log_date === dateStr);

    const isFertile =
      !!preferences?.show_fertile_days &&
      !!prediction?.fertile_window_start &&
      !!prediction?.fertile_window_end &&
      isWithinInterval(date, {
        start: startOfDay(parseISO(prediction.fertile_window_start)),
        end: startOfDay(parseISO(prediction.fertile_window_end)),
      });

    const predictedPeriodEnd = predictedPeriodMax ? addDays(predictedPeriodMax, Math.max(0, periodLength - 1)) : null;

    const isPredictedPeriod =
      !!predictedPeriodMin &&
      !!predictedPeriodEnd &&
      isWithinInterval(date, { start: predictedPeriodMin, end: predictedPeriodEnd });

    const isOvulation = preferences?.show_fertile_days && dateStr === ovulationDateStr;

    // Make expected period days read as winter in the strip
    const baseSeason = getPredictedSeason(date);
    const predictedSeason: SeasonKey = isPredictedPeriod ? 'winter' : baseSeason;

    return {
      date,
      dateStr,
      isToday: isSameDay(date, today0),
      hasBleeding: !!bleeding,
      isFertile,
      isOvulation,
      isPredictedPeriod: isPredictedPeriod && !bleeding,
      predictedSeason,
    };
  });

  return (
    <Link to="/cycle">
      <Card className="glass rounded-2xl hover:shadow-soft transition-all">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted/50">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('nav.cycle')}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{t(`seasons.${currentSeason}`)}</span>
                  {dayInCycle > 0 && <span>· {t('cycle.day')} {dayInCycle}</span>}
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Legend chips - horizontally scrollable on mobile */}
          <div className="flex gap-2 text-xs overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
            {prediction?.next_period_start_min && (
              <Badge 
                variant="outline" 
                className="font-normal pl-5 relative bg-background/80 flex-shrink-0"
              >
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-destructive" />
                {format(parseISO(prediction.next_period_start_min), 'd MMM', { locale: dateLocale })}
              </Badge>
            )}
            {preferences?.show_fertile_days && prediction?.fertile_window_start && (
              <Badge 
                variant="outline" 
                className="font-normal outline outline-2 outline-offset-2 outline-green-500 bg-background/80 flex-shrink-0 whitespace-nowrap"
              >
                {t('today.fertile')} {format(parseISO(prediction.fertile_window_start), 'd MMM', { locale: dateLocale })}
              </Badge>
            )}
            {preferences?.show_fertile_days && ovulationDateStr && (
              <Badge 
                variant="outline" 
                className="font-normal pr-5 relative bg-background/80 flex-shrink-0"
              >
                {format(parseISO(ovulationDateStr), 'd MMM', { locale: dateLocale })}
                <span className="absolute -top-0.5 -right-0.5 cycle-ovulation-star text-[10px] font-bold">★</span>
              </Badge>
            )}
          </div>

          {/* 7-day strip (season background + event markers) */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((d) => (
              <div
                key={d.dateStr}
                className={`
                  relative min-h-[44px] rounded
                  flex flex-col items-center justify-center text-center
                  ${seasonTileClass[d.predictedSeason]}
                  ${d.isToday ? 'ring-[3px] ring-primary ring-offset-2 ring-offset-background' : ''}
                  ${d.isFertile ? 'outline outline-2 outline-offset-1 outline-green-500' : ''}
                `}
              >
                {/* Menstruation marker */}
                {d.hasBleeding && (
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-destructive" />
                )}
                {/* Predicted marker */}
                {d.isPredictedPeriod && !d.hasBleeding && (
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-destructive/35 ring-1 ring-destructive/30" />
                )}
                {/* Ovulation star */}
                {d.isOvulation && (
                  <span className="absolute top-0.5 right-0.5 cycle-ovulation-star text-xs font-bold">★</span>
                )}

                <span className="text-[10px] text-muted-foreground leading-none">
                  {format(d.date, 'EE', { locale: dateLocale }).substring(0, 2)}
                </span>
                <span className="text-lg font-bold leading-tight">{format(d.date, 'd')}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
