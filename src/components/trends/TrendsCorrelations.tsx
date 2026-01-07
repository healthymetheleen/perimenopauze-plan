import { Lightbulb, ArrowRight, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Correlation } from '@/hooks/useTrendsData';

interface TrendsCorrelationsProps {
  correlations: Correlation[];
  period: number;
}

const strengthColors: Record<string, string> = {
  laag: 'bg-muted text-muted-foreground',
  matig: 'bg-primary/10 text-primary',
  hoog: 'bg-primary/20 text-primary',
  low: 'bg-muted text-muted-foreground',
  moderate: 'bg-primary/10 text-primary',
  high: 'bg-primary/20 text-primary',
};

const strengthLabels: Record<string, string> = {
  laag: 'low',
  matig: 'moderate',
  hoog: 'high',
};

export function TrendsCorrelations({ correlations, period }: TrendsCorrelationsProps) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  if (correlations.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t('trends.this_stood_out')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p>{t('trends.not_enough_data')}</p>
          <p className="text-sm mt-1">{t('trends.log_more_days')}</p>
        </CardContent>
      </Card>
    );
  }

  // Translate correlation data
  const translateCorrelation = (correlation: Correlation) => {
    // Map Dutch triggers/effects to translation keys
    const triggerMap: Record<string, { key: string; params?: object }> = {
      'Laat eten na 21:00': { key: 'trends.correlation_late_eating' },
      'Ontbijt eiwit laag': { key: 'trends.correlation_low_protein' },
      'Veel eetmomenten (>5)': { key: 'trends.correlation_many_meals' },
    };
    
    const effectMap: Record<string, string> = {
      'Slaapkwaliteit lager': 'trends.correlation_sleep_lower',
      'Energie lager': 'trends.correlation_energy_lower',
      'Onrust hoger': 'trends.correlation_unrest_higher',
    };

    const trigger = triggerMap[correlation.trigger] 
      ? t(triggerMap[correlation.trigger].key)
      : correlation.trigger;
    
    const effect = effectMap[correlation.effect]
      ? t(effectMap[correlation.effect])
      : correlation.effect;

    const strength = isEnglish 
      ? (strengthLabels[correlation.strength] || correlation.strength)
      : correlation.strength;

    return { trigger, effect, strength, description: correlation.description };
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          {t('trends.this_stood_out')}
        </CardTitle>
        <CardDescription>
          {t('trends.based_on_days', { days: period })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {correlations.map((correlation, index) => {
            const translated = translateCorrelation(correlation);
            return (
              <div 
                key={index}
                className="p-3 rounded-xl border bg-gradient-to-r from-card to-muted/30"
              >
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-medium text-sm">{translated.trigger}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-sm text-primary">{translated.effect}</span>
                  <Badge className={`text-xs ${strengthColors[correlation.strength] || strengthColors[translated.strength]}`}>
                    {translated.strength}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {translated.description}
                </p>
              </div>
            );
          })}
        </div>
        
        {/* Disclaimer */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {t('trends.disclaimer')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
