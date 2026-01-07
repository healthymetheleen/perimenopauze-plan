import { Calendar, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendPeriod } from '@/hooks/useTrendsData';

interface TrendsFiltersProps {
  period: TrendPeriod;
  setPeriod: (p: TrendPeriod) => void;
  showSeasonOverlay: boolean;
  setShowSeasonOverlay: (v: boolean) => void;
}

export function TrendsFilters({
  period,
  setPeriod,
  showSeasonOverlay,
  setShowSeasonOverlay,
}: TrendsFiltersProps) {
  const { t } = useTranslation();

  const periods: { value: TrendPeriod; labelKey: string }[] = [
    { value: 7, labelKey: 'trends.period_7' },
    { value: 14, labelKey: 'trends.period_14' },
    { value: 28, labelKey: 'trends.period_28' },
    { value: 'cycle', labelKey: 'trends.period_cycle' },
  ];

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1 flex-wrap">
          {periods.map(p => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p.value)}
              className="text-xs"
            >
              {t(p.labelKey)}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Season overlay */}
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="season-overlay" className="text-sm cursor-pointer">
          {t('trends.season_overlay')}
        </Label>
        <Switch
          id="season-overlay"
          checked={showSeasonOverlay}
          onCheckedChange={setShowSeasonOverlay}
        />
      </div>
    </div>
  );
}
