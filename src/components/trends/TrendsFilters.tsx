import { Calendar, Palette, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendPeriod, TrendFocus } from '@/hooks/useTrendsData';

interface TrendsFiltersProps {
  period: TrendPeriod;
  setPeriod: (p: TrendPeriod) => void;
  showSeasonOverlay: boolean;
  setShowSeasonOverlay: (v: boolean) => void;
  focus: TrendFocus;
  setFocus: (f: TrendFocus) => void;
}

const periods: { value: TrendPeriod; label: string }[] = [
  { value: 7, label: '7 dagen' },
  { value: 14, label: '14 dagen' },
  { value: 28, label: '28 dagen' },
  { value: 'cycle', label: 'Deze cyclus' },
];

const focusOptions: { value: TrendFocus; label: string }[] = [
  { value: 'all', label: 'Alles' },
  { value: 'energie', label: 'Energie' },
  { value: 'slaap', label: 'Slaap' },
  { value: 'cravings', label: 'Cravings' },
  { value: 'onrust', label: 'Onrust' },
];

export function TrendsFilters({
  period,
  setPeriod,
  showSeasonOverlay,
  setShowSeasonOverlay,
  focus,
  setFocus,
}: TrendsFiltersProps) {
  return (
    <div className="space-y-4">
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
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Season overlay & Focus */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="season-overlay" className="text-sm cursor-pointer">
            Seizoen overlay
          </Label>
          <Switch
            id="season-overlay"
            checked={showSeasonOverlay}
            onCheckedChange={setShowSeasonOverlay}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            {focusOptions.map(f => (
              <Button
                key={f.value}
                variant={focus === f.value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFocus(f.value)}
                className="text-xs px-2"
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
