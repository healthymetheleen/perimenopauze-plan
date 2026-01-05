import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  subMonths,
  differenceInDays,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  endOfMonth,
  getDay,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar, Droplet, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { BleedingLog, Cycle, CyclePreferences, CyclePrediction, seasonLabels, getSeasonForDate } from '@/hooks/useCycle';

interface CycleCalendarProps {
  prediction: Omit<CyclePrediction, 'id' | 'owner_id' | 'generated_at'> | CyclePrediction;
  preferences: CyclePreferences | null;
  cycles: Cycle[];
  bleedingLogs: BleedingLog[];
  onDayClick: (dateStr: string) => void;
}

type SeasonKey = 'winter' | 'lente' | 'zomer' | 'herfst' | 'onbekend';

export function CycleCalendar({ prediction, preferences, cycles, bleedingLogs, onDayClick }: CycleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSeasons, setShowSeasons] = useState(true);
  const [showMenstruation, setShowMenstruation] = useState(true);
  const [showFertile, setShowFertile] = useState(!!preferences?.show_fertile_days);

  useEffect(() => {
    if (typeof preferences?.show_fertile_days === 'boolean') {
      setShowFertile(preferences.show_fertile_days);
    }
  }, [preferences?.show_fertile_days]);

  const avgCycleLength = prediction.avg_cycle_length || preferences?.avg_cycle_length || 28;
  const periodLength = preferences?.avg_period_length || 5;
  const lutealLength = preferences?.luteal_phase_length || 13;

  const latestCycleStart = useMemo(() => {
    const start = cycles?.[0]?.start_date;
    return start ? startOfDay(parseISO(start)) : null;
  }, [cycles]);

  const predictedPeriodMin = prediction.next_period_start_min ? startOfDay(parseISO(prediction.next_period_start_min)) : null;
  const predictedPeriodMax = prediction.next_period_start_max ? startOfDay(parseISO(prediction.next_period_start_max)) : null;

  const seasonSurfaceClass: Record<SeasonKey, string> = {
    winter: 'season-surface-winter',
    lente: 'season-surface-lente',
    zomer: 'season-surface-zomer',
    herfst: 'season-surface-herfst',
    onbekend: 'season-surface-onbekend',
  };

  const seasonTextClass: Record<SeasonKey, string> = {
    winter: 'season-text-winter',
    lente: 'season-text-lente',
    zomer: 'season-text-zomer',
    herfst: 'season-text-herfst',
    onbekend: 'season-text-onbekend',
  };

  const getPredictedSeason = (date: Date): SeasonKey => {
    if (!latestCycleStart) return 'onbekend';
    return getSeasonForDate(date, latestCycleStart, avgCycleLength, periodLength, lutealLength);
  };

  const ovulationDateStr = (() => {
    if (!prediction.ovulation_min || !prediction.ovulation_max) return undefined;
    const min = startOfDay(parseISO(prediction.ovulation_min));
    const max = startOfDay(parseISO(prediction.ovulation_max));
    const mid = addDays(min, Math.floor(differenceInDays(max, min) / 2));
    return format(mid, 'yyyy-MM-dd');
  })();

  const calendarDays = useMemo(() => {
    const today0 = startOfDay(new Date());
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    // We want Monday as first day, so adjust
    const firstDayOfWeek = getDay(monthStart);
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday = 0
    
    // Calculate how many days to show (including padding for full weeks)
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const totalDays = startOffset + daysInMonth;
    const weeksNeeded = Math.ceil(totalDays / 7);
    const totalCells = weeksNeeded * 7;

    return Array.from({ length: totalCells }, (_, i) => {
      const date = addDays(monthStart, i - startOffset);
      const dateStr = format(date, 'yyyy-MM-dd');
      const bleeding = bleedingLogs?.find((l) => l.log_date === dateStr);
      const isCurrentMonth = isSameMonth(date, currentMonth);

      const isFertile =
        !!preferences?.show_fertile_days &&
        !!prediction.fertile_window_start &&
        !!prediction.fertile_window_end &&
        isWithinInterval(date, {
          start: startOfDay(parseISO(prediction.fertile_window_start)),
          end: startOfDay(parseISO(prediction.fertile_window_end)),
        });

      const predictedPeriodEnd =
        predictedPeriodMax ? addDays(predictedPeriodMax, Math.max(0, periodLength - 1)) : null;

      const isPredictedPeriod =
        !!predictedPeriodMin &&
        !!predictedPeriodEnd &&
        isWithinInterval(date, { start: predictedPeriodMin, end: predictedPeriodEnd });

      const isOvulation = dateStr === ovulationDateStr;

      const baseSeason = getPredictedSeason(date);
      const season: SeasonKey = isPredictedPeriod ? 'winter' : baseSeason;

      return {
        date,
        dateStr,
        isToday: isSameDay(date, today0),
        isCurrentMonth,
        bleeding: bleeding?.intensity,
        isFertile,
        isOvulation,
        isPredictedPeriod: isPredictedPeriod && !bleeding,
        predictedSeason: season,
      };
    });
  }, [bleedingLogs, currentMonth, getPredictedSeason, ovulationDateStr, periodLength, predictedPeriodMax, predictedPeriodMin, prediction.fertile_window_end, prediction.fertile_window_start, preferences?.show_fertile_days]);

  // Build season segments along the 35-day window
  const seasonSegments = useMemo(() => {
    const segments: { season: SeasonKey; startIdx: number; endIdx: number }[] = [];
    if (calendarDays.length === 0) return segments;

    let season = calendarDays[0].predictedSeason;
    let startIdx = 0;

    for (let i = 1; i < calendarDays.length; i++) {
      if (calendarDays[i].predictedSeason !== season) {
        segments.push({ season, startIdx, endIdx: i - 1 });
        season = calendarDays[i].predictedSeason;
        startIdx = i;
      }
    }
    segments.push({ season, startIdx, endIdx: calendarDays.length - 1 });
    return segments;
  }, [calendarDays]);

  // Convert segments into grid background pieces (split per row so we keep a fixed 7x5 grid)
  const backgroundPieces = useMemo(() => {
    const pieces: Array<{ season: SeasonKey; row: number; colStart: number; colEnd: number }> = [];

    for (const seg of seasonSegments) {
      const startRow = Math.floor(seg.startIdx / 7) + 1;
      const endRow = Math.floor(seg.endIdx / 7) + 1;
      const startCol = (seg.startIdx % 7) + 1;
      const endCol = (seg.endIdx % 7) + 1;

      if (startRow === endRow) {
        pieces.push({ season: seg.season, row: startRow, colStart: startCol, colEnd: endCol });
        continue;
      }

      // First row (partial)
      pieces.push({ season: seg.season, row: startRow, colStart: startCol, colEnd: 7 });
      // Middle rows (full)
      for (let r = startRow + 1; r <= endRow - 1; r++) {
        pieces.push({ season: seg.season, row: r, colStart: 1, colEnd: 7 });
      }
      // Last row (partial)
      pieces.push({ season: seg.season, row: endRow, colStart: 1, colEnd: endCol });
    }

    return pieces;
  }, [seasonSegments]);

  const segmentStarts = useMemo(() => new Set(seasonSegments.map((s) => s.startIdx)), [seasonSegments]);

  const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        {/* Month navigation header */}
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="Vorige maand"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle className="text-lg">
              {format(currentMonth, 'MMMM yyyy', { locale: nl })}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="Volgende maand"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Go to today button if not viewing current month */}
        {!isSameMonth(currentMonth, new Date()) && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mb-2"
            onClick={() => setCurrentMonth(new Date())}
          >
            Naar vandaag
          </Button>
        )}

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

        {/* Legend (events only) */}
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-destructive" /> Menstruatie
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-destructive/40 ring-1 ring-destructive/30" /> Verwacht
          </div>
          {preferences?.show_fertile_days && (
            <>
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full border-2 border-[hsl(140_60%_45%)] bg-[hsl(140_60%_45%/0.15)]" /> Vruchtbaar
              </div>
              <div className="flex items-center gap-1">
                <span className="cycle-ovulation-star">★</span> Ovulatie
              </div>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="relative">
          {/* Season backgrounds (panels) behind a fixed grid */}
          {showSeasons && (
            <div className="absolute inset-0 grid grid-cols-7 gap-1 pointer-events-none" style={{ marginTop: '28px' }}>
              {backgroundPieces.map((p, idx) => (
                <div
                  key={`${p.season}-${p.row}-${p.colStart}-${p.colEnd}-${idx}`}
                  className={`rounded-xl ${seasonSurfaceClass[p.season]} opacity-90`}
                  style={{
                    gridRow: `${p.row} / ${p.row + 1}`,
                    gridColumn: `${p.colStart} / ${p.colEnd + 1}`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="relative z-10 grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const hasBleeding = !!day.bleeding && showMenstruation;
              const showPredicted = !!day.isPredictedPeriod && showMenstruation;
              const showFertileDay = !!day.isFertile && showFertile;
              const showOvulation = !!day.isOvulation && showFertile;

              const season = day.predictedSeason;
              const showSeasonLabel = showSeasons && segmentStarts.has(idx) && season !== 'onbekend' && day.isCurrentMonth;

              return (
                <button
                  key={day.dateStr}
                  onClick={() => onDayClick(day.dateStr)}
                  className={`
                    relative min-h-[44px] rounded-lg
                    bg-background/70 dark:bg-background/25
                    border border-border/40
                    flex flex-col items-center justify-center text-center px-0.5 py-1
                    transition-all hover:bg-background/85 dark:hover:bg-background/40
                    ${day.isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                    ${!day.isCurrentMonth ? 'opacity-30' : ''}
                  `}
                >
                  {/* Season label (first day in a season segment) */}
                  {showSeasonLabel && (
                    <span className={`absolute top-1 left-1 text-[10px] font-medium leading-none ${seasonTextClass[season as SeasonKey]} opacity-90`}>
                      {seasonLabels[season as SeasonKey]}
                    </span>
                  )}

                  {/* Menstruation marker */}
                  {hasBleeding && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-destructive" />
                  )}
                  {/* Predicted marker */}
                  {showPredicted && !hasBleeding && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-destructive/35 ring-1 ring-destructive/30" />
                  )}

                  {/* Fertile ring */}
                  {showFertileDay && (
                    <span className="absolute inset-0.5 rounded-lg cycle-ring-fertile" />
                  )}
                  {/* Ovulation star */}
                  {showOvulation && (
                    <span className="absolute top-1 right-1 cycle-ovulation-star text-xs font-bold">★</span>
                  )}

                  <span className="text-lg font-bold leading-tight">
                    {format(day.date, 'd')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
