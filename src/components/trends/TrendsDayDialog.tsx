import { format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Snowflake, Leaf, Sun, Wind, Utensils, Moon, Activity } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TrendDayData } from '@/hooks/useTrendsData';

interface TrendsDayDialogProps {
  day: TrendDayData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-4 w-4" />,
  lente: <Leaf className="h-4 w-4" />,
  zomer: <Sun className="h-4 w-4" />,
  herfst: <Wind className="h-4 w-4" />,
  onbekend: null,
};

export function TrendsDayDialog({ day, open, onOpenChange }: TrendsDayDialogProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'nl' ? nl : enUS;
  const isEnglish = i18n.language === 'en';

  if (!day) return null;

  const hasSymptoms = day.headache || day.anxiety || day.irritability || day.bloating || day.breastTender || day.hotFlashes;
  
  const getTip = () => {
    if (day.proteinG < 50 && day.mealsCount > 0) {
      return isEnglish 
        ? 'Your protein was low today. Try more protein at breakfast tomorrow.'
        : 'Je eiwit was laag vandaag. Probeer morgen meer eiwit bij ontbijt.';
    }
    if (day.lastMealTime && parseInt(day.lastMealTime.split(':')[0]) >= 21) {
      return isEnglish
        ? 'You ate late. Try eating earlier tomorrow for better sleep.'
        : 'Je at laat. Probeer morgen eerder te eten voor betere slaap.';
    }
    if (day.score && day.score >= 7) {
      return isEnglish
        ? 'Great day! What helped today?'
        : 'Mooie dag! Wat hielp er vandaag?';
    }
    return isEnglish
      ? 'Look at what you can adjust for a better day tomorrow.'
      : 'Bekijk wat je kunt aanpassen voor een betere dag morgen.';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {format(new Date(day.date), 'EEEE d MMMM', { locale: dateLocale })}
            <Badge variant="outline" className="capitalize">
              {seasonIcons[day.season]}
              <span className="ml-1">{t(`seasons.${day.season}`)}</span>
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {day.score !== null && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">{t('trends.score_chart_title')}</span>
              <span className="text-2xl font-bold">{day.score}/10</span>
            </div>
          )}
          
          <div className="p-3 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{isEnglish ? 'Nutrition' : 'Voeding'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{isEnglish ? 'Meals' : 'Maaltijden'}:</span> {day.mealsCount}
              </div>
              <div>
                <span className="text-muted-foreground">kcal:</span> {Math.round(day.kcalTotal) || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">{t('trends.kpi_protein')}:</span> {Math.round(day.proteinG)}g
              </div>
              <div>
                <span className="text-muted-foreground">{t('trends.kpi_fiber')}:</span> {Math.round(day.fiberG)}g
              </div>
            </div>
            {day.lastMealTime && (
              <p className="text-xs text-muted-foreground mt-2">
                {t('trends.last_meal')}: {day.lastMealTime}
              </p>
            )}
          </div>
          
          {day.sleepDurationMin !== null && (
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">{isEnglish ? 'Sleep' : 'Slaap'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('trends.sleep_duration')}:</span> {(day.sleepDurationMin / 60).toFixed(1)} {isEnglish ? 'hrs' : 'uur'}
                </div>
                {day.sleepQuality !== null && (
                  <div>
                    <span className="text-muted-foreground">{t('trends.sleep_quality')}:</span> {day.sleepQuality}/10
                  </div>
                )}
              </div>
            </div>
          )}
          
          {hasSymptoms && (
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-medium">{t('trends.symptoms_title')}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {day.headache && <Badge variant="outline" className="text-xs">{t('trends.symptom_headache')}</Badge>}
                {day.anxiety && <Badge variant="outline" className="text-xs">{t('trends.symptom_anxiety')}</Badge>}
                {day.irritability && <Badge variant="outline" className="text-xs">{t('trends.symptom_irritability')}</Badge>}
                {day.bloating && <Badge variant="outline" className="text-xs">{t('trends.symptom_bloating')}</Badge>}
                {day.breastTender && <Badge variant="outline" className="text-xs">{t('trends.symptom_breast_tender')}</Badge>}
                {day.hotFlashes && <Badge variant="outline" className="text-xs">{t('trends.symptom_hot_flashes')}</Badge>}
              </div>
            </div>
          )}
          
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm font-medium mb-1">💡 {t('trends.day_dialog_tip')}</p>
            <p className="text-xs text-muted-foreground">
              {getTip()}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
