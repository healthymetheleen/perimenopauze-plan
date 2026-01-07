import { useTranslation } from 'react-i18next';
import { Clock, Utensils, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EatingPatternStats } from '@/hooks/useTrendsData';

interface TrendsEatingPatternProps {
  stats: EatingPatternStats;
}

export function TrendsEatingPattern({ stats }: TrendsEatingPatternProps) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const hasData = stats.avgMealsPerDay > 0;

  if (!hasData) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-5 w-5 text-teal-500" />
            {t('trends.eating_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p>{t('trends.no_eating_data')}</p>
        </CardContent>
      </Card>
    );
  }

  const getRhythmLabel = () => {
    if (stats.rhythmScore >= 70) return t('trends.rhythm_excellent');
    if (stats.rhythmScore >= 50) return t('trends.rhythm_good');
    return t('trends.rhythm_moderate');
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-5 w-5 text-teal-500" />
          {t('trends.eating_title')}
        </CardTitle>
        <CardDescription>
          {t('trends.eating_subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('trends.meals_per_day')}</span>
            </div>
            <p className="text-xl font-semibold">{stats.avgMealsPerDay}</p>
          </div>
          
          <div className="p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('trends.eating_window')}</span>
            </div>
            <p className="text-xl font-semibold">{stats.avgEatingWindowHours} {isEnglish ? 'hrs' : 'uur'}</p>
          </div>
          
          <div className="p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('trends.first_meal')}</span>
            </div>
            <p className="text-xl font-semibold">{stats.avgFirstMealTime || '-'}</p>
          </div>
          
          <div className="p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('trends.last_meal')}</span>
            </div>
            <p className="text-xl font-semibold">{stats.avgLastMealTime || '-'}</p>
          </div>
        </div>
        
        {/* Rhythm score */}
        <div className="p-3 rounded-xl border bg-gradient-to-r from-teal-50/50 to-card dark:from-teal-950/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t('trends.rhythm_score')}</span>
            <Badge variant="outline" className={
              stats.rhythmScore >= 70 
                ? 'text-success border-success' 
                : stats.rhythmScore >= 50 
                  ? 'text-warning border-warning' 
                  : 'text-destructive border-destructive'
            }>
              {getRhythmLabel()}
            </Badge>
          </div>
          <Progress value={stats.rhythmScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {isEnglish 
              ? 'The more consistent your eating times, the more stable your energy and blood sugar.'
              : 'Hoe consistenter je eettijden, hoe stabieler je energie en bloedsuiker.'}
          </p>
        </div>
        
        {/* Snack ratio */}
        {stats.snackRatio > 0.3 && (
          <div className="mt-3 p-2 rounded-lg bg-warning/10 text-sm">
            <p className="text-muted-foreground">
              💡 {t('trends.snack_warning')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
