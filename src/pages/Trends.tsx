import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingState } from '@/components/ui/loading-state';
import { useTrendsData, TrendPeriod, TrendFocus } from '@/hooks/useTrendsData';
import {
  TrendsKPIStrip,
  TrendsFilters,
  TrendsScoreChart,
  TrendsProteinChart,
  TrendsSleepBlock,
  TrendsCorrelations,
  TrendsSymptomsBlock,
  TrendsEatingPattern,
  TrendsForecast,
  TrendsDayDialog,
} from '@/components/trends';
import { TrendDayData } from '@/hooks/useTrendsData';

export default function TrendsPage() {
  const [period, setPeriod] = useState<TrendPeriod>(14);
  const [showSeasonOverlay, setShowSeasonOverlay] = useState(true);
  const [focus, setFocus] = useState<TrendFocus>('all');
  const [selectedDay, setSelectedDay] = useState<TrendDayData | null>(null);

  const {
    isLoading,
    trendDays,
    kpis,
    correlations,
    topSymptoms,
    eatingPatternStats,
    currentSeason,
    nextSeason,
    daysUntilNextSeason,
  } = useTrendsData(period, showSeasonOverlay);

  const numDays = period === 'cycle' ? 28 : period;

  const handleDayClick = (date: string) => {
    const day = trendDays.find(d => d.date === date);
    if (day) setSelectedDay(day);
  };

  // Filter data based on focus
  const shouldShow = (section: string): boolean => {
    if (focus === 'all') return true;
    const focusMap: Record<TrendFocus, string[]> = {
      all: [],
      energie: ['score', 'protein', 'eating', 'correlations'],
      slaap: ['score', 'sleep', 'correlations'],
      cravings: ['score', 'protein', 'eating', 'symptoms', 'correlations'],
      onrust: ['score', 'symptoms', 'sleep', 'correlations'],
      sport: ['score', 'protein', 'sleep'],
    };
    return focusMap[focus]?.includes(section) ?? true;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Trends & Analyses</h1>
          <p className="text-muted-foreground">
            Ontdek patronen en krijg persoonlijke inzichten
          </p>
        </div>

        {isLoading ? (
          <LoadingState message="Data laden..." />
        ) : (
          <>
            {/* KPI Strip */}
            <TrendsKPIStrip kpis={kpis} period={numDays} />
            
            {/* Filters */}
            <TrendsFilters
              period={period}
              setPeriod={setPeriod}
              showSeasonOverlay={showSeasonOverlay}
              setShowSeasonOverlay={setShowSeasonOverlay}
              focus={focus}
              setFocus={setFocus}
            />
            
            {/* Main Charts */}
            {shouldShow('score') && (
              <TrendsScoreChart 
                data={trendDays} 
                showSeasonOverlay={showSeasonOverlay}
                onDayClick={handleDayClick}
              />
            )}
            
            {shouldShow('protein') && (
              <TrendsProteinChart data={trendDays} />
            )}
            
            {/* Sleep Block */}
            {shouldShow('sleep') && (
              <TrendsSleepBlock data={trendDays} />
            )}
            
            {/* Symptoms Block */}
            {shouldShow('symptoms') && (
              <TrendsSymptomsBlock symptoms={topSymptoms} period={numDays} />
            )}
            
            {/* Eating Pattern */}
            {shouldShow('eating') && (
              <TrendsEatingPattern stats={eatingPatternStats} />
            )}
            
            {/* Correlations */}
            {shouldShow('correlations') && (
              <TrendsCorrelations correlations={correlations} period={numDays} />
            )}
            
            {/* Forecast */}
            <TrendsForecast 
              currentSeason={currentSeason}
              nextSeason={nextSeason}
              daysUntilNextSeason={daysUntilNextSeason}
            />
          </>
        )}
      </div>
      
      {/* Day Detail Dialog */}
      <TrendsDayDialog
        day={selectedDay}
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      />
    </AppLayout>
  );
}
