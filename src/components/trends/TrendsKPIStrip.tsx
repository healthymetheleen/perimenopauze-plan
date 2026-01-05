import { useState } from 'react';
import { 
  Database, Moon, Utensils, Flame, Drumstick, Leaf, 
  Clock, Coffee, ChevronDown, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { TrendsKPIs } from '@/hooks/useTrendsData';

interface TrendsKPIStripProps {
  kpis: TrendsKPIs;
  period: number;
}

function KPICard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  flag,
  onClick,
}: { 
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  flag?: boolean;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl bg-card border transition-all hover:shadow-soft text-left ${
        flag ? 'border-warning/50' : 'border-border/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
        {flag && <AlertCircle className="h-3 w-3 text-warning" />}
      </div>
      <p className="text-lg font-semibold">{value}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground">{subValue}</p>
      )}
    </button>
  );
}

export function TrendsKPIStrip({ kpis, period }: TrendsKPIStripProps) {
  const [showMissing, setShowMissing] = useState(false);
  
  const completenessLabel = `${kpis.dataCompleteness.logged} van ${kpis.dataCompleteness.total} dagen`;
  const sleepLabel = kpis.sleepAvg.trend 
    ? `${kpis.sleepAvg.hours.toFixed(1)} uur`
    : 'Geen data';
  const caloriesLabel = kpis.caloriesAvg.max > 0 
    ? `${kpis.caloriesAvg.min}–${kpis.caloriesAvg.max}`
    : 'Geen data';

  return (
    <Collapsible open={showMissing} onOpenChange={setShowMissing}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <CollapsibleTrigger asChild>
            <div>
              <KPICard 
                icon={Database}
                label="Data"
                value={completenessLabel}
                flag={kpis.dataCompleteness.missing.length > 0}
              />
            </div>
          </CollapsibleTrigger>
          
          <KPICard 
            icon={Moon}
            label="Slaap gem."
            value={sleepLabel}
            subValue={kpis.sleepAvg.trend === 'up' ? '↑ goed' : kpis.sleepAvg.trend === 'down' ? '↓ kort' : undefined}
          />
          
          <KPICard 
            icon={Utensils}
            label="Eetmomenten"
            value={kpis.eatingMomentsAvg.count > 0 ? `${kpis.eatingMomentsAvg.count}x/dag` : '-'}
            flag={kpis.eatingMomentsAvg.flag}
            subValue={kpis.eatingMomentsAvg.flag ? 'Veel momenten' : undefined}
          />
          
          <KPICard 
            icon={Flame}
            label="Calorieën"
            value={caloriesLabel}
            subValue="range"
          />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KPICard 
            icon={Drumstick}
            label="Eiwit/dag"
            value={kpis.proteinAvg.grams > 0 ? `${kpis.proteinAvg.grams}g` : '-'}
            subValue={kpis.proteinAvg.perKg ? `${kpis.proteinAvg.perKg}g/kg` : undefined}
          />
          
          <KPICard 
            icon={Leaf}
            label="Vezels/dag"
            value={kpis.fiberAvg.grams > 0 ? `${kpis.fiberAvg.grams}g` : '-'}
            subValue={kpis.fiberAvg.trend === 'up' ? '↑' : kpis.fiberAvg.trend === 'down' ? '↓ laag' : undefined}
            flag={kpis.fiberAvg.trend === 'down'}
          />
          
          <KPICard 
            icon={Clock}
            label="Laatste maaltijd"
            value={kpis.lastMealAvg.time || '-'}
            subValue="gemiddeld"
          />
          
          <KPICard 
            icon={Coffee}
            label="Cafeïne na 14u"
            value={`${kpis.caffeineAfter14.days} dagen`}
            flag={kpis.caffeineAfter14.days > 3}
          />
        </div>
        
        <CollapsibleContent>
          {kpis.dataCompleteness.missing.length > 0 && (
            <div className="p-3 rounded-xl bg-muted/50 border border-warning/30">
              <p className="text-sm font-medium flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                Wat ontbreekt
              </p>
              <div className="flex flex-wrap gap-2">
                {kpis.dataCompleteness.missing.map(item => (
                  <Badge key={item} variant="outline" className="capitalize">
                    {item}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Meer data = betrouwbaardere inzichten. Log dagelijks voor de beste analyse.
              </p>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
