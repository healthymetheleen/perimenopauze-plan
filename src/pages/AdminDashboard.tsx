import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { useAdminStats, useAIUsageBreakdown } from '@/hooks/useAdminStats';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Navigate } from 'react-router-dom';
import { 
  Users, CreditCard, Sparkles, TrendingUp, 
  BarChart3, Euro, FileText, Moon, Utensils,
  MessageSquare, Activity, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PremiumGrantsCard } from '@/components/admin/PremiumGrantsCard';
import { ProductsAdminCard } from '@/components/admin/ProductsAdminCard';

export default function AdminDashboard() {
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const { data: stats, isLoading: loadingStats, refetch } = useAdminStats();
  const { data: aiBreakdown, isLoading: loadingBreakdown } = useAIUsageBreakdown();

  if (checkingAdmin) {
    return (
      <AppLayout>
        <LoadingState message="Toegang controleren..." />
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loadingStats) {
    return (
      <AppLayout>
        <LoadingState message="Statistieken laden..." />
      </AppLayout>
    );
  }

  const conversionRate = stats && stats.total_members > 0 
    ? ((stats.paid_members / stats.total_members) * 100).toFixed(1)
    : '0';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              GDPR-vriendelijk overzicht (geen individuele tracking)
            </p>
          </div>
          <button 
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {stats && (
          <>
            {/* Member Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass rounded-2xl">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Totaal leden</p>
                      <p className="text-2xl font-bold">{stats.total_members}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass rounded-2xl">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Betaald</p>
                      <p className="text-2xl font-bold">{stats.paid_members}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass rounded-2xl">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      <TrendingUp className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Trial</p>
                      <p className="text-2xl font-bold">{stats.trial_members}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass rounded-2xl">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      <Activity className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conversie</p>
                      <p className="text-2xl font-bold">{conversionRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Usage & Costs */}
            <Card className="glass rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Gebruik & Kosten
                </CardTitle>
                <CardDescription>
                  Huidige maand: {format(new Date(), 'MMMM yyyy', { locale: nl })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground">Vandaag</p>
                    <p className="text-xl font-bold">{stats.ai_calls_today}</p>
                    <p className="text-xs text-muted-foreground">calls</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground">Deze maand</p>
                    <p className="text-xl font-bold">{stats.ai_calls_this_month}</p>
                    <p className="text-xs text-muted-foreground">calls</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground">Unieke gebruikers</p>
                    <p className="text-xl font-bold">{stats.unique_ai_users_month}</p>
                    <p className="text-xs text-muted-foreground">deze maand</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground">Gem. per gebruiker</p>
                    <p className="text-xl font-bold">{stats.avg_ai_calls_per_user_month || 0}</p>
                    <p className="text-xs text-muted-foreground">calls/maand</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10">
                  <div className="flex items-center gap-3">
                    <Euro className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Geschatte kosten maand</p>
                      <p className="text-lg font-bold">€{stats.estimated_ai_cost_month_eur}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Euro className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Per actieve gebruiker</p>
                      <p className="text-lg font-bold">€{stats.estimated_ai_cost_per_user_month_eur}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Function Breakdown */}
            {aiBreakdown && aiBreakdown.length > 0 && (
              <Card className="glass rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">AI Functies Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aiBreakdown.map((fn) => (
                      <div key={fn.function_name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{fn.function_name}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {fn.unique_users} gebruikers
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>{fn.calls_this_month} calls</span>
                          <span className="text-muted-foreground">€{fn.estimated_cost_eur}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Stats */}
            <Card className="glass rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Activiteit deze maand</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Utensils className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{stats.meals_logged_month}</p>
                      <p className="text-xs text-muted-foreground">Maaltijden</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Moon className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{stats.sleep_sessions_month}</p>
                      <p className="text-xs text-muted-foreground">Slaapsessies</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Activity className="h-4 w-4 text-foreground" />
                    <div>
                      <p className="text-sm font-medium">{stats.cycle_logs_month}</p>
                      <p className="text-xs text-muted-foreground">Cyclus logs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <FileText className="h-4 w-4 text-foreground" />
                    <div>
                      <p className="text-sm font-medium">{stats.symptoms_logged_month}</p>
                      <p className="text-xs text-muted-foreground">Symptomen</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <MessageSquare className="h-4 w-4 text-foreground" />
                    <div>
                      <p className="text-sm font-medium">{stats.community_posts_month}</p>
                      <p className="text-xs text-muted-foreground">Community</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premium Grants */}
            <PremiumGrantsCard />

            {/* Affiliate Products */}
            <ProductsAdminCard />

            {/* Page Views */}
            {stats.page_views && stats.page_views.length > 0 && (
              <Card className="glass rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Pagina weergaven deze maand</CardTitle>
                  <CardDescription>Anoniem - alleen totalen per pagina</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.page_views.map((pv, index) => {
                      const maxViews = stats.page_views![0].views;
                      const widthPercent = (pv.views / maxViews) * 100;
                      
                      return (
                        <div key={pv.page} className="relative">
                          <div 
                            className="absolute inset-y-0 left-0 bg-primary/10 rounded"
                            style={{ width: `${widthPercent}%` }}
                          />
                          <div className="relative flex items-center justify-between p-2">
                            <code className="text-sm">{pv.page}</code>
                            <span className="text-sm font-medium">{pv.views}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Footer */}
            <p className="text-xs text-muted-foreground text-center">
              Laatste update: {format(new Date(stats.generated_at), 'HH:mm:ss', { locale: nl })}
              {' · '}
              Alle data is geaggregeerd en anoniem (GDPR-compliant)
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
}
