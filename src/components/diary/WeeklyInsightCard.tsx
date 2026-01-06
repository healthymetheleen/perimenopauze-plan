import { Sparkles, TrendingUp, Target, Leaf, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyNutritionInsight } from '@/hooks/useWeeklyNutritionInsight';
import { useConsent } from '@/hooks/useConsent';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export function WeeklyInsightCard() {
  const { consent } = useConsent();
  const { data, isLoading, error } = useWeeklyNutritionInsight();
  
  const hasAIConsent = consent?.accepted_ai_processing === true;

  if (!hasAIConsent) {
    return (
      <Card className="rounded-2xl bg-muted/30">
        <CardContent className="pt-6 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Schakel AI-inzichten in bij Instellingen voor wekelijkse voedingsanalyse.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Weekanalyse
            <Badge variant="secondary" className="text-xs">AI</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || data?.error) {
    const errorMessage = data?.message || data?.error || 'Kon analyse niet laden';
    return (
      <Card className="rounded-2xl bg-muted/30">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </CardContent>
      </Card>
    );
  }

  const insight = data?.insight;
  if (!insight) return null;

  const weekStartDate = insight.week_start ? new Date(insight.week_start) : new Date();

  return (
    <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Weekanalyse
            <Badge variant="secondary" className="text-xs">Ortho</Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Week van {format(weekStartDate, 'd MMM', { locale: nl })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-foreground">{insight.samenvatting}</p>

        {/* Weekly stats */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/50">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{insight.days_logged}</p>
            <p className="text-xs text-muted-foreground">dagen</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{insight.avg_protein}g</p>
            <p className="text-xs text-muted-foreground">gem. eiwit</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{insight.avg_fiber}g</p>
            <p className="text-xs text-muted-foreground">gem. vezels</p>
          </div>
        </div>

        {/* Strong points */}
        {insight.sterke_punten && insight.sterke_punten.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <TrendingUp className="h-4 w-4" />
              Goed gedaan
            </div>
            <ul className="space-y-1">
              {insight.sterke_punten.map((punt, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  {punt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Attention points */}
        {insight.aandachtspunten && insight.aandachtspunten.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" />
              Aandachtspunten
            </div>
            <ul className="space-y-1">
              {insight.aandachtspunten.map((punt, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  {punt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Orthomolecular tip */}
        {insight.ortho_tip && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm text-primary">{insight.ortho_tip.titel}</span>
            </div>
            <p className="text-sm text-muted-foreground">{insight.ortho_tip.uitleg}</p>
            {insight.ortho_tip.voedingsmiddelen && insight.ortho_tip.voedingsmiddelen.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {insight.ortho_tip.voedingsmiddelen.map((voedsel, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-background/50">
                    {voedsel}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Weekly goal */}
        {insight.weekdoel && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-sm">
              <span className="font-medium">🎯 Weekdoel:</span>{' '}
              <span className="text-muted-foreground">{insight.weekdoel}</span>
            </p>
          </div>
        )}

        {data?.cached && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Analyse wordt elke week vernieuwd
          </p>
        )}
      </CardContent>
    </Card>
  );
}
