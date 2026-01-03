import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { CalendarDays, TrendingUp, Activity, ArrowRight, Plus, Snowflake, Leaf, Sun, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoreBadge } from '@/components/ui/score-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useDailyScores } from '@/hooks/useDiary';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useAuth } from '@/lib/auth';
import { useLatestPrediction, useCyclePreferences, seasonLabels, seasonColors } from '@/hooks/useCycle';

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-3 w-3" />,
  lente: <Leaf className="h-3 w-3" />,
  zomer: <Sun className="h-3 w-3" />,
  herfst: <Wind className="h-3 w-3" />,
  onbekend: null,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: scores, isLoading, error, refetch } = useDailyScores(7);
  const { data: entitlements } = useEntitlements();
  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayScore = scores?.find(s => s.day_date === today);
  const recentScores = scores?.slice(0, 5) || [];

  const currentSeason = prediction?.current_season || 'onbekend';
  const showSeasonBadge = preferences?.onboarding_completed && currentSeason !== 'onbekend';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with season badge */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Perimenopauze Plan
              </h1>
              {showSeasonBadge && (
                <Link to="/cycle">
                  <Badge 
                    variant="secondary" 
                    className={`${seasonColors[currentSeason].bg} ${seasonColors[currentSeason].text} border-0 flex items-center gap-1`}
                  >
                    {seasonIcons[currentSeason]}
                    {seasonLabels[currentSeason]}
                  </Badge>
                </Link>
              )}
            </div>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE d MMMM", { locale: nl })}
            </p>
          </div>
          <Button asChild>
            <Link to="/diary">
              <Plus className="h-4 w-4 mr-2" />
              Registreren
            </Link>
          </Button>
        </div>

        {/* Today's score */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Vandaag
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState size="sm" />
            ) : error ? (
              <ErrorState onRetry={() => refetch()} />
            ) : todayScore ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ScoreBadge score={todayScore.day_score} size="lg" />
                  <div>
                    <p className="font-medium">{todayScore.meals_count} maaltijden</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(todayScore.protein_g)}g eiwit · {Math.round(todayScore.fiber_g)}g vezels
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/diary">
                    Bekijken
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={<CalendarDays className="h-8 w-8" />}
                title="Nog niets geregistreerd"
                description="Begin met je eerste maaltijd van vandaag"
                action={{
                  label: 'Start registratie',
                  onClick: () => window.location.href = '/diary',
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="rounded-2xl hover:shadow-md transition-shadow">
            <Link to="/trends" className="block p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">Trends</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Bekijk je voortgang over tijd
              </p>
              {!entitlements?.can_use_trends && (
                <span className="inline-block mt-2 text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                  Premium
                </span>
              )}
            </Link>
          </Card>

          <Card className="rounded-2xl hover:shadow-md transition-shadow">
            <Link to="/patterns" className="block p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-accent/20">
                  <Activity className="h-5 w-5 text-accent-foreground" />
                </div>
                <span className="font-medium">Patronen</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ontdek verbanden
              </p>
              {!entitlements?.can_use_patterns && (
                <span className="inline-block mt-2 text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                  Premium
                </span>
              )}
            </Link>
          </Card>
        </div>

        {/* Recent days */}
        {recentScores.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Afgelopen dagen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentScores.map((score) => (
                  <Link
                    key={score.day_id}
                    to={`/diary?date=${score.day_date}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ScoreBadge score={score.day_score} size="sm" />
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(score.day_date), "EEEE d MMM", { locale: nl })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {score.meals_count} maaltijden
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}