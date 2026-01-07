import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingState } from '@/components/ui/loading-state';
import { useTrendsData, TrendPeriod } from '@/hooks/useTrendsData';
import {
  TrendsKPIStrip,
  TrendsFilters,
  TrendsScoreChart,
  TrendsProteinChart,
  TrendsSleepBlock,
  TrendsCorrelations,
  TrendsSymptomsBlock,
  TrendsEatingPattern,
  TrendsDayDialog,
} from '@/components/trends';
import { TrendDayData } from '@/hooks/useTrendsData';

export default function TrendsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<TrendPeriod>(14);
  const [showSeasonOverlay, setShowSeasonOverlay] = useState(true);
  const [selectedDay, setSelectedDay] = useState<TrendDayData | null>(null);

  const {
    isLoading,
    trendDays,
    kpis,
    correlations,
    topSymptoms,
    eatingPatternStats,
  } = useTrendsData(period, showSeasonOverlay);

  const numDays = period === 'cycle' ? 28 : period;

  const handleDayClick = (date: string) => {
    const day = trendDays.find(d => d.date === date);
    if (day) setSelectedDay(day);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('trends.title')}</h1>
          <p className="text-muted-foreground">
            {t('trends.subtitle')}
          </p>
        </div>

        {isLoading ? (
          <LoadingState message={t('trends.loading')} />
        ) : (
          <>
            {/* KPI Strip */}
            <TrendsKPIStrip kpis={kpis} period={numDays} />
            
            {/* Filters - only period and season overlay */}
            <TrendsFilters
              period={period}
              setPeriod={setPeriod}
              showSeasonOverlay={showSeasonOverlay}
              setShowSeasonOverlay={setShowSeasonOverlay}
            />
            
            {/* Dit viel op - moved up */}
            <TrendsCorrelations correlations={correlations} period={numDays} />
            
            {/* Score Chart */}
            <TrendsScoreChart 
              data={trendDays} 
              showSeasonOverlay={showSeasonOverlay}
              onDayClick={handleDayClick}
            />
            
            {/* Protein Chart */}
            <TrendsProteinChart data={trendDays} />
            
            {/* Sleep Block */}
            <TrendsSleepBlock data={trendDays} />
            
            {/* Symptoms Block */}
            <TrendsSymptomsBlock symptoms={topSymptoms} period={numDays} />
            
            {/* Eating Pattern */}
            <TrendsEatingPattern stats={eatingPatternStats} />
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
