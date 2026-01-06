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

  // Calculate where we are in the cycle - for dates beyond avg cycle length, 
  // we need to "restart" the cycle count from predicted next period
  const getPredictedSeason = (date: Date): SeasonKey => {
    if (!latestCycleStart) return 'onbekend';
    
    const daysSinceStart = differenceInDays(startOfDay(date), startOfDay(latestCycleStart));
    
    // If we're beyond the cycle length, calculate based on predicted next cycle start
    if (daysSinceStart >= avgCycleLength) {
      // How many full cycles have passed?
      const cyclesPassed = Math.floor(daysSinceStart / avgCycleLength);
      const adjustedCycleStart = addDays(latestCycleStart, cyclesPassed * avgCycleLength);
      return getSeasonForDate(date, adjustedCycleStart, avgCycleLength, periodLength, lutealLength);
    }
    
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

      // Calculate if this date falls in a fertile window
      // For future cycles, calculate based on repeating pattern
      let isFertile = false;
      let isOvulation = false;
      let isPredictedPeriod = false;

      if (latestCycleStart) {
        const daysSinceStart = differenceInDays(startOfDay(date), startOfDay(latestCycleStart));
        
        // Only predict future dates (from today onwards) or current/past cycle for context
        if (daysSinceStart >= 0) {
          // Calculate which cycle number this falls into (0 = current cycle, 1 = next, etc.)
          const cycleNumber = Math.floor(daysSinceStart / avgCycleLength);
          // Calculate day within the cycle
          const dayInCycle = (daysSinceStart % avgCycleLength) + 1;
          
          // Check if this is a predicted period day (first X days of each cycle)
          // Only show predicted if no actual bleeding logged
          if (!bleeding && dayInCycle <= periodLength) {
            // Only show as predicted if this is a future cycle (not the current one where we might have logs)
            const cycleStartForThisCycle = addDays(latestCycleStart, cycleNumber * avgCycleLength);
            const isInFutureCycle = cycleNumber > 0 || differenceInDays(date, new Date()) >= 0;
            
            // Check if we have logged bleeding for this cycle already
            const hasLoggedBleedingInCycle = bleedingLogs?.some(log => {
              const logDate = parseISO(log.log_date);
              return differenceInDays(logDate, cycleStartForThisCycle) >= 0 && 
                     differenceInDays(logDate, cycleStartForThisCycle) < avgCycleLength;
            });
            
            // Show predicted period for future cycles OR current cycle if no logged bleeding yet
            if (isInFutureCycle && !hasLoggedBleedingInCycle) {
              isPredictedPeriod = true;
            }
          }
          
          // Calculate fertile window and ovulation for this cycle
          if (preferences?.show_fertile_days) {
            const ovulationDay = avgCycleLength - lutealLength;
            const fertileWindowStart = ovulationDay - 5;
            const fertileWindowEnd = ovulationDay + 1;
            
            if (dayInCycle >= fertileWindowStart && dayInCycle <= fertileWindowEnd) {
              isFertile = true;
            }
            
            // Ovulation is the middle day (ovulationDay - 1 to ovulationDay + 1)
            if (dayInCycle >= ovulationDay - 1 && dayInCycle <= ovulationDay + 1) {
              isOvulation = dayInCycle === ovulationDay;
            }
          }
        }
      }

      const baseSeason = getPredictedSeason(date);
      const season: SeasonKey = (isPredictedPeriod || bleeding) ? 'winter' : baseSeason;

      return {
        date,
        dateStr,
        isToday: isSameDay(date, today0),
        isCurrentMonth,
        bleeding: bleeding?.intensity,
        isFertile: isFertile && !bleeding, // Don't show fertile on bleeding days
        isOvulation: isOvulation && !bleeding,
        isPredictedPeriod: isPredictedPeriod && !bleeding,
        predictedSeason: season,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bleedingLogs, currentMonth, latestCycleStart, avgCycleLength, periodLength, lutealLength, preferences?.show_fertile_days]);

  // Build season segments along the calendar window
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

  // Convert segments into grid background pieces with label info
  const backgroundPieces = useMemo(() => {
    const pieces: Array<{ 
      season: SeasonKey; 
      row: number; 
      colStart: number; 
      colEnd: number;
      showLabel: boolean;
    }> = [];

    for (const seg of seasonSegments) {
      const startRow = Math.floor(seg.startIdx / 7) + 1;
      const endRow = Math.floor(seg.endIdx / 7) + 1;
      const startCol = (seg.startIdx % 7) + 1;
      const endCol = (seg.endIdx % 7) + 1;

      if (startRow === endRow) {
        pieces.push({ 
          season: seg.season, 
          row: startRow, 
          colStart: startCol, 
          colEnd: endCol,
          showLabel: seg.season !== 'onbekend' && calendarDays[seg.startIdx]?.isCurrentMonth
        });
        continue;
      }

      // First row (partial) - show label here
      pieces.push({ 
        season: seg.season, 
        row: startRow, 
        colStart: startCol, 
        colEnd: 7,
        showLabel: seg.season !== 'onbekend' && calendarDays[seg.startIdx]?.isCurrentMonth
      });
      // Middle rows (full)
      for (let r = startRow + 1; r <= endRow - 1; r++) {
        pieces.push({ season: seg.season, row: r, colStart: 1, colEnd: 7, showLabel: false });
      }
      // Last row (partial)
      pieces.push({ season: seg.season, row: endRow, colStart: 1, colEnd: endCol, showLabel: false });
    }

    return pieces;
  }, [seasonSegments, calendarDays]);

  const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  // Ensure minimum height for mobile rendering
  if (calendarDays.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Kalender laden...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl overflow-hidden">
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
        <div className="flex flex-wrap gap-4 mt-4">
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

        {/* Quick date chips - styled like calendar days */}
        <div className="flex flex-wrap gap-2 mt-4">
          {prediction.next_period_start_min && (
            <Badge 
              variant="outline" 
              className="font-normal pl-5 relative bg-background/80"
            >
              {/* Red menstruation dot */}
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-destructive" />
              {format(parseISO(prediction.next_period_start_min), 'd MMM', { locale: nl })}
            </Badge>
          )}
          {preferences?.show_fertile_days && prediction.fertile_window_start && (
            <Badge 
              variant="outline" 
              className="font-normal outline outline-2 outline-offset-1 outline-green-500 bg-background/80"
            >
              Vruchtbaar {format(parseISO(prediction.fertile_window_start), 'd MMM', { locale: nl })}
            </Badge>
          )}
          {preferences?.show_fertile_days && ovulationDateStr && (
            <Badge 
              variant="outline" 
              className="font-normal pr-5 relative bg-background/80"
            >
              {format(parseISO(ovulationDateStr), 'd MMM', { locale: nl })}
              {/* Ovulation star */}
              <span className="absolute -top-0.5 -right-0.5 cycle-ovulation-star text-[10px] font-bold">★</span>
            </Badge>
          )}
        </div>

        {/* Legend (events only) */}
        <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
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
          {/* Season backgrounds with labels */}
          {showSeasons && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridTemplateRows: `repeat(${Math.ceil(calendarDays.length / 7)}, 1fr)`,
                columnGap: '0.5rem',
                rowGap: '1.5rem', // Match the days grid row gap
              }}
            >
              {backgroundPieces.map((p, idx) => (
                <div
                  key={`${p.season}-${p.row}-${p.colStart}-${p.colEnd}-${idx}`}
                  className={`relative rounded-xl ${seasonSurfaceClass[p.season]} opacity-90`}
                  style={{
                    gridRow: `${p.row} / ${p.row + 1}`,
                    gridColumn: `${p.colStart} / ${p.colEnd + 1}`,
                  }}
                >
                  {/* Season label positioned above the background */}
                  {p.showLabel && (
                    <span 
                      className={`absolute -top-5 left-1 text-xs font-bold ${seasonTextClass[p.season]} z-20`}
                    >
                      {seasonLabels[p.season]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Days grid - with extra row gap for label space */}
          <div className="relative z-10 grid grid-cols-7 gap-x-2 gap-y-6">
            {calendarDays.map((day, idx) => {
              const hasBleeding = !!day.bleeding && showMenstruation;
              const showPredicted = !!day.isPredictedPeriod && showMenstruation;
              const showFertileDay = !!day.isFertile && showFertile;
              const showOvulation = !!day.isOvulation && showFertile;
              const today = startOfDay(new Date());
              const isFutureDay = day.date > today;

              return (
                <button
                  key={day.dateStr}
                  onClick={() => !isFutureDay && onDayClick(day.dateStr)}
                  disabled={isFutureDay}
                  className={`
                    relative min-h-[52px] rounded-lg
                    bg-background/80 dark:bg-background/30
                    border border-border/40
                    flex flex-col items-center justify-end text-center px-0.5 py-1.5
                    transition-all
                    ${isFutureDay ? 'cursor-not-allowed opacity-50' : 'hover:bg-background/90 dark:hover:bg-background/50'}
                    ${day.isToday ? 'ring-[3px] ring-primary ring-offset-2 ring-offset-background' : ''}
                    ${!day.isCurrentMonth ? 'opacity-30' : ''}
                    ${showFertileDay ? 'outline outline-2 outline-offset-1 outline-green-500' : ''}
                  `}
                >
                  {/* Menstruation marker */}
                  {hasBleeding && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-destructive" />
                  )}
                  {/* Predicted marker */}
                  {showPredicted && !hasBleeding && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-destructive/35 ring-1 ring-destructive/30" />
                  )}

                  {/* Ovulation star */}
                  {showOvulation && (
                    <span className="absolute top-1 right-1 cycle-ovulation-star text-xs font-bold">★</span>
                  )}

                  {/* Day abbreviation */}
                  <span className="text-[10px] text-muted-foreground leading-none mb-0.5">
                    {format(day.date, 'EE', { locale: nl }).substring(0, 2)}
                  </span>
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
