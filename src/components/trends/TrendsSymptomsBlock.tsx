import { useTranslation } from 'react-i18next';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TopSymptom } from '@/hooks/useTrendsData';

interface TrendsSymptomsBlockProps {
  symptoms: TopSymptom[];
  period: number;
}

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-destructive" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-success" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

export function TrendsSymptomsBlock({ symptoms, period }: TrendsSymptomsBlockProps) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  // Translate symptom labels
  const translateSymptom = (code: string, label: string) => {
    const map: Record<string, string> = {
      'onrust': t('trends.symptom_anxiety'),
      'prikkelbaar': t('trends.symptom_irritability'),
      'hoofdpijn': t('trends.symptom_headache'),
      'bloating': t('trends.symptom_bloating'),
      'borsten': t('trends.symptom_breast_tender'),
      'opvliegers': t('trends.symptom_hot_flashes'),
    };
    return map[code] || label;
  };

  // Translate season labels
  const translateSeason = (season: string) => {
    return t(`seasons.${season}`, season);
  };

  if (symptoms.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-rose-500" />
            {t('trends.symptoms_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p>{t('trends.no_symptoms')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-5 w-5 text-rose-500" />
          {t('trends.symptoms_title')}
        </CardTitle>
        <CardDescription>
          {t('trends.symptoms_subtitle', { days: period })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {symptoms.map((symptom) => (
            <div 
              key={symptom.code}
              className="p-3 rounded-xl border bg-card"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{translateSymptom(symptom.code, symptom.label)}</span>
                  <TrendIcon trend={symptom.trend} />
                </div>
                <Badge variant="outline" className="text-xs capitalize">
                  {t('trends.symptoms_peak')}: {translateSeason(symptom.peakSeason)}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={symptom.avgIntensity * 10} 
                  className="h-2 flex-1"
                />
                <span className="text-xs text-muted-foreground w-12">
                  {t('trends.symptoms_count', { count: symptom.count })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
