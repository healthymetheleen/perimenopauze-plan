import { AppLayout } from '@/components/layout/AppLayout';
import { PaywallCard } from '@/components/ui/paywall-card';
import { LoadingState } from '@/components/ui/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFeatureAccess } from '@/hooks/useEntitlements';
import { TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useDailyScores } from '@/hooks/useDiary';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function TrendsPage() {
  const { hasAccess, isLoading: accessLoading } = useFeatureAccess('trends');
  const { data: scores, isLoading: scoresLoading } = useDailyScores(14);

  if (accessLoading) {
    return (
      <AppLayout>
        <LoadingState message="Toegang controleren..." />
      </AppLayout>
    );
  }

  if (!hasAccess) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-12">
          <PaywallCard
            feature="Trends & inzichten"
            description="Bekijk hoe je eetpatroon en ervaren welzijn zich over tijd ontwikkelen en herken terugkerende patronen."
            benefits={[
              'Inzichtelijke overzichten over meerdere dagen',
              'Grafische weergave van je voortgang',
              'Signalen en persoonlijke observaties',
              'Vergelijk patronen over meerdere weken',
            ]}
          />
        </div>
      </AppLayout>
    );
  }

  const chartData = (scores || [])
    .slice()
    .reverse()
    .map((score) => ({
      date: format(new Date(score.day_date), 'd MMM', { locale: nl }),
      score: score.day_score,
      protein: Math.round(score.protein_g),
      fiber: Math.round(score.fiber_g),
    }));

  const avgScore = scores?.length
    ? scores.reduce((sum, s) => sum + s.day_score, 0) / scores.length
    : 0;

  const avgProtein = scores?.length
    ? scores.reduce((sum, s) => sum + s.protein_g, 0) / scores.length
    : 0;

  const getTrendIcon = (current: number, target: number) => {
    if (current >= target) return <ArrowUp className="h-4 w-4 text-accent" />;
    if (current >= target * 0.8) return <Minus className="h-4 w-4 text-warning" />;
    return <ArrowDown className="h-4 w-4 text-destructive" />;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Trends</h1>
          <p className="text-muted-foreground">Je voortgang over de afgelopen 2 weken</p>
        </div>

        {scoresLoading ? (
          <LoadingState />
        ) : (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="rounded-2xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Gem. score</span>
                    {getTrendIcon(avgScore, 7)}
                  </div>
                  <p className="text-2xl font-bold">{avgScore.toFixed(1)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Gem. eiwit</span>
                    {getTrendIcon(avgProtein, 80)}
                  </div>
                  <p className="text-2xl font-bold">{Math.round(avgProtein)}g</p>
                </CardContent>
              </Card>
            </div>

            {/* Score chart */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Dagscore
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          domain={[0, 10]} 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nog geen data beschikbaar
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Protein chart */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Eiwitinname</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="protein"
                          stroke="hsl(var(--accent))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--accent))' }}
                          name="Eiwit (g)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nog geen data beschikbaar
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}