import { Dumbbell, ArrowRight, Heart, Users, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLatestPrediction } from '@/hooks/useCycle';
import { getWorkoutForSeason } from '@/hooks/useMovement';

export function MovementWidget() {
  const { t } = useTranslation();
  const { data: prediction } = useLatestPrediction();
  const currentSeason = prediction?.current_season || 'onbekend';
  
  const workout = currentSeason !== 'onbekend' ? getWorkoutForSeason(currentSeason) : null;

  // Get advice from translations
  const getAdvice = (season: string, type: 'feeling' | 'family' | 'work') => {
    const key = `movement_widget.advice.${season}.${type}`;
    const result = t(key, { returnObjects: true });
    return Array.isArray(result) ? result : [];
  };

  const intensityLabel = workout ? t(`movement.intensityLabels.${workout.intensity}`) : '';
  const seasonLabel = t(`seasons.${currentSeason}`);

  const intensityColors: Record<string, string> = {
    low: 'bg-primary/10 text-primary',
    moderate: 'bg-muted text-foreground',
    high: 'bg-primary/20 text-primary',
  };

  if (currentSeason === 'onbekend') {
    return null;
  }

  const advice = {
    feeling: getAdvice(currentSeason, 'feeling'),
    family: getAdvice(currentSeason, 'family'),
    work: getAdvice(currentSeason, 'work'),
  };

  return (
    <Card className="glass-strong rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          {t('movement_widget.title')} - {seasonLabel}
          {workout && (
            <Badge className={intensityColors[workout.intensity]}>
              {intensityLabel}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workout && (
          <div className="space-y-3">
            <p className="text-base text-muted-foreground">
              {t(`movement.phaseWorkouts.${workout.phase}.description`)}
            </p>
            
            <div className="flex items-center gap-2">
              <span className="font-semibold">{t('movement_widget.recommended')}</span>
              <span className="text-muted-foreground">{workout.recommendedMinutes} min</span>
            </div>

            {/* Exercise badges - show all with names */}
            <div className="flex flex-wrap gap-2">
              {workout.exercises.slice(0, 3).map((exercise) => (
                <Badge key={exercise.id} variant="secondary" className="text-sm py-1 px-3">
                  {t(exercise.nameKey)}
                </Badge>
              ))}
              {workout.exercises.length > 3 && (
                <Badge variant="outline" className="text-sm py-1 px-3">
                  {t('movement_widget.and_more', { count: workout.exercises.length - 3 })}
                </Badge>
              )}
            </div>
          </div>
        )}

        {advice.feeling.length > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/50">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Heart className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{t('movement_widget.feeling')}</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {advice.feeling.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{t('movement_widget.family')}</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {advice.family.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Briefcase className="h-4 w-4 text-foreground" />
                <span className="text-sm font-semibold text-foreground">{t('movement_widget.work')}</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {advice.work.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <Button variant="ghost" size="sm" asChild className="w-full">
          <Link to="/bewegen">
            {t('movement_widget.view_all')}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
