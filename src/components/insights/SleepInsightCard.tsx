import { useTranslation } from 'react-i18next';
import { Moon, Sparkles, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSleepInsight, SleepInsight } from '@/hooks/useAIInsights';
import { useConsent } from '@/hooks/useConsent';

interface SleepInsightCardProps {
  avgDuration: string;
  avgQuality: string;
  consistency: string;
  interruptions?: string;
  cycleSeason?: string;
}

export function SleepInsightCard({
  avgDuration,
  avgQuality,
  consistency,
  interruptions,
  cycleSeason,
}: SleepInsightCardProps) {
  const { t } = useTranslation();
  const { consent } = useConsent();
  const hasAIConsent = consent?.accepted_ai_processing === true;

  const { data: insight, isLoading, error } = useSleepInsight(
    {
      avgDuration,
      avgQuality,
      consistency,
      interruptions,
      cycleSeason,
    },
    hasAIConsent
  );

  if (!hasAIConsent) {
    return null;
  }

  return (
    <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Moon className="h-5 w-5 text-primary" />
          {t('sleep_insight.title')}
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            AI
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            {t('sleep_insight.not_available')}
          </p>
        ) : insight ? (
          <>
            <p className="text-sm text-foreground">
              {insight.sleepPattern}
            </p>
            {insight.connection && (
              <p className="text-sm text-muted-foreground">
                {insight.connection}
              </p>
            )}
            <p className="text-sm text-muted-foreground italic">
              {insight.normalization}
            </p>
            {insight.cycleContext && (
              <p className="text-sm text-primary">
                {insight.cycleContext}
              </p>
            )}
            {insight.disclaimer && (
              <div className="flex items-start gap-2 pt-2 text-xs text-muted-foreground border-t border-border/50">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{insight.disclaimer}</span>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
