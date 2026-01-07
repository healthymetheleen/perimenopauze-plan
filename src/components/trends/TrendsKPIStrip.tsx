import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const [showMissing, setShowMissing] = useState(false);
  
  const isEnglish = i18n.language === 'en';
  
  const completenessLabel = t('trends.kpi_days_logged', { 
    logged: kpis.dataCompleteness.logged, 
    total: kpis.dataCompleteness.total 
  });
  
  const sleepLabel = kpis.sleepAvg.trend 
    ? t('trends.kpi_hours', { hours: kpis.sleepAvg.hours.toFixed(1) })
    : t('common.no_data');
  
  const caloriesLabel = kpis.caloriesAvg.max > 0 
    ? `${kpis.caloriesAvg.min}–${kpis.caloriesAvg.max}`
    : t('common.no_data');

  // Translate missing items
  const translateMissing = (item: string) => {
    const map: Record<string, string> = {
      'maaltijden': t('trends.missing_meals'),
      'slaap': t('trends.missing_sleep'),
      'klachten': t('trends.missing_symptoms'),
    };
    return map[item] || item;
  };

  return (
    <Collapsible open={showMissing} onOpenChange={setShowMissing}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <CollapsibleTrigger asChild>
            <div>
              <KPICard 
                icon={Database}
                label={t('trends.kpi_data')}
                value={completenessLabel}
                flag={kpis.dataCompleteness.missing.length > 0}
              />
            </div>
          </CollapsibleTrigger>
          
          <KPICard 
            icon={Moon}
            label={t('trends.kpi_sleep')}
            value={sleepLabel}
            subValue={kpis.sleepAvg.trend === 'up' ? '↑' : kpis.sleepAvg.trend === 'down' ? '↓' : undefined}
          />
          
          <KPICard 
            icon={Utensils}
            label={isEnglish ? 'Meals' : 'Eetmomenten'}
            value={kpis.eatingMomentsAvg.count > 0 ? `${kpis.eatingMomentsAvg.count}x/${isEnglish ? 'day' : 'dag'}` : '-'}
            flag={kpis.eatingMomentsAvg.flag}
          />
          
          <KPICard 
            icon={Flame}
            label={t('trends.kpi_calories')}
            value={caloriesLabel}
          />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KPICard 
            icon={Drumstick}
            label={t('trends.kpi_protein')}
            value={kpis.proteinAvg.grams > 0 ? `${kpis.proteinAvg.grams}g` : '-'}
            subValue={kpis.proteinAvg.perKg ? `${kpis.proteinAvg.perKg}g/kg` : undefined}
          />
          
          <KPICard 
            icon={Leaf}
            label={t('trends.kpi_fiber')}
            value={kpis.fiberAvg.grams > 0 ? `${kpis.fiberAvg.grams}g` : '-'}
            subValue={kpis.fiberAvg.trend === 'up' ? '↑' : kpis.fiberAvg.trend === 'down' ? '↓' : undefined}
            flag={kpis.fiberAvg.trend === 'down'}
          />
          
          <KPICard 
            icon={Clock}
            label={t('trends.last_meal')}
            value={kpis.lastMealAvg.time || '-'}
          />
          
          <KPICard 
            icon={Coffee}
            label={t('trends.kpi_caffeine')}
            value={t('trends.kpi_after_14', { days: kpis.caffeineAfter14.days })}
            flag={kpis.caffeineAfter14.days > 3}
          />
        </div>
        
        <CollapsibleContent>
          {kpis.dataCompleteness.missing.length > 0 && (
            <div className="p-3 rounded-xl bg-muted/50 border border-warning/30">
              <p className="text-sm font-medium flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                {t('trends.kpi_missing', { items: '' })}
              </p>
              <div className="flex flex-wrap gap-2">
                {kpis.dataCompleteness.missing.map(item => (
                  <Badge key={item} variant="outline" className="capitalize">
                    {translateMissing(item)}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isEnglish 
                  ? 'More data = more reliable insights. Log daily for the best analysis.'
                  : 'Meer data = betrouwbaardere inzichten. Log dagelijks voor de beste analyse.'}
              </p>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
