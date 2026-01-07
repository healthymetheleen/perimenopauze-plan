import { Sparkles, RefreshCw, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyInsight, DailyInsight } from '@/hooks/useAIInsights';
import { useAIUsage } from '@/hooks/useAIUsage';
import { useConsent } from '@/hooks/useConsent';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

interface DailyReflectionCardProps {
  mealsCount: number;
  sleepQuality?: string;
  stressLevel?: string;
  cycleSeason?: string;
  movement?: string;
  energy?: string;
}

export function DailyReflectionCard({
  mealsCount,
  sleepQuality,
  stressLevel,
  cycleSeason,
  movement,
  energy,
}: DailyReflectionCardProps) {
  const { t } = useTranslation();
  const { consent } = useConsent();
  const { data: usage } = useAIUsage();
  const [showInsight, setShowInsight] = useState(false);
  
  const hasAIConsent = consent?.accepted_ai_processing === true;
  const hasData = mealsCount > 0 || !!sleepQuality || !!stressLevel;

  const { data: insight, isLoading, error, refetch } = useDailyInsight(
    {
      mealsCount,
      sleepQuality,
      stressLevel,
      cycleSeason,
      movement,
      energy,
    },
    showInsight && hasData
  );

  if (!hasAIConsent) {
    return (
      <Card className="rounded-2xl bg-muted/30">
        <CardContent className="pt-6 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {t('reflection.enable_ai_hint')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className="rounded-2xl bg-muted/30">
        <CardContent className="pt-6 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {t('reflection.log_day_hint')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!showInsight) {
    return (
      <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">{t('reflection.title')}</span>
              <Badge variant="secondary" className="text-xs">Premium</Badge>
            </div>
            {usage && (
              <span className="text-xs text-muted-foreground">
                {t('reflection.requests_remaining', { count: usage.remaining })}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('reflection.description')}
          </p>
          <Button 
            onClick={() => setShowInsight(true)}
            className="w-full"
            variant="outline"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {t('reflection.generate')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('reflection.title')}
            <Badge variant="secondary" className="text-xs">AI</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('reflection.refresh')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : error ? (
          <div className="text-sm text-muted-foreground">
            <p>{t('reflection.error')}</p>
          </div>
        ) : insight ? (
          <>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {insight.pattern}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {insight.context}
                </p>
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-sm italic text-primary">
                  "{insight.reflection}"
                </p>
              </div>
            </div>
            {insight.disclaimer && (
              <div className="flex items-start gap-2 pt-2 text-xs text-muted-foreground">
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
