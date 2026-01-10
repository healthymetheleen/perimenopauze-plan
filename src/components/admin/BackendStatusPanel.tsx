import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
  Server
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HealthCheckResult {
  status: 'ok' | 'warning' | 'error';
  latency_ms: number;
  message?: string;
}

interface BackendStatus {
  database: HealthCheckResult;
  auth: HealthCheckResult;
  functions: HealthCheckResult;
  overall: 'healthy' | 'degraded' | 'down';
  checked_at: string;
}

export function BackendStatusPanel() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const { data: status, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['backend-health'],
    queryFn: async (): Promise<BackendStatus> => {
      const startTime = Date.now();
      const results: BackendStatus = {
        database: { status: 'error', latency_ms: 0 },
        auth: { status: 'error', latency_ms: 0 },
        functions: { status: 'error', latency_ms: 0 },
        overall: 'down',
        checked_at: new Date().toISOString(),
      };

      // Check database connection (simple count query on public table)
      try {
        const dbStart = Date.now();
        const { error: dbError } = await supabase
          .from('affiliate_products')
          .select('id', { count: 'exact', head: true })
          .limit(1);
        
        const dbLatency = Date.now() - dbStart;
        
        if (dbError) {
          results.database = { 
            status: 'error', 
            latency_ms: dbLatency, 
            message: dbError.code === 'PGRST301' ? 'Connection timeout' : dbError.message 
          };
        } else if (dbLatency > 3000) {
          results.database = { status: 'warning', latency_ms: dbLatency, message: 'Slow response' };
        } else {
          results.database = { status: 'ok', latency_ms: dbLatency };
        }
      } catch (e) {
        results.database = { 
          status: 'error', 
          latency_ms: Date.now() - startTime, 
          message: e instanceof Error ? e.message : 'Connection failed' 
        };
      }

      // Check auth service
      try {
        const authStart = Date.now();
        const { data: session } = await supabase.auth.getSession();
        const authLatency = Date.now() - authStart;
        
        if (authLatency > 2000) {
          results.auth = { status: 'warning', latency_ms: authLatency, message: 'Slow response' };
        } else {
          results.auth = { status: 'ok', latency_ms: authLatency };
        }
      } catch (e) {
        results.auth = { 
          status: 'error', 
          latency_ms: 0, 
          message: e instanceof Error ? e.message : 'Auth check failed' 
        };
      }

      // Check edge functions (ping a simple function if available)
      try {
        const fnStart = Date.now();
        // Just check if we can reach the functions endpoint
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/`, {
          method: 'HEAD',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        const fnLatency = Date.now() - fnStart;
        
        if (response.status === 404 || response.status === 200) {
          // 404 is expected for root path, 200 means functions are available
          if (fnLatency > 2000) {
            results.functions = { status: 'warning', latency_ms: fnLatency, message: 'Slow response' };
          } else {
            results.functions = { status: 'ok', latency_ms: fnLatency };
          }
        } else {
          results.functions = { status: 'warning', latency_ms: fnLatency, message: `Status ${response.status}` };
        }
      } catch (e) {
        results.functions = { 
          status: 'error', 
          latency_ms: 0, 
          message: e instanceof Error ? e.message : 'Functions unreachable' 
        };
      }

      // Calculate overall status
      const statuses = [results.database.status, results.auth.status, results.functions.status];
      if (statuses.every(s => s === 'ok')) {
        results.overall = 'healthy';
      } else if (statuses.some(s => s === 'error')) {
        results.overall = 'down';
      } else {
        results.overall = 'degraded';
      }

      return results;
    },
    refetchInterval: 60000, // Check every minute
    staleTime: 30000,
    retry: 1,
    retryDelay: 1000,
  });

  const getStatusIcon = (check: HealthCheckResult) => {
    switch (check.status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getOverallBadge = () => {
    if (isLoading || error) {
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Controleren...</Badge>;
    }
    
    switch (status?.overall) {
      case 'healthy':
        return <Badge variant="default" className="gap-1 bg-success text-success-foreground"><CheckCircle className="h-3 w-3" /> Gezond</Badge>;
      case 'degraded':
        return <Badge variant="default" className="gap-1 bg-warning text-warning-foreground"><AlertTriangle className="h-3 w-3" /> Vertraagd</Badge>;
      case 'down':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Problemen</Badge>;
      default:
        return <Badge variant="secondary">Onbekend</Badge>;
    }
  };

  const formatLatency = (ms: number) => {
    if (ms < 100) return <span className="text-success">{ms}ms</span>;
    if (ms < 1000) return <span className="text-foreground">{ms}ms</span>;
    if (ms < 3000) return <span className="text-warning">{(ms / 1000).toFixed(1)}s</span>;
    return <span className="text-destructive">{(ms / 1000).toFixed(1)}s</span>;
  };

  return (
    <Card className="glass rounded-2xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  Backend Status
                </CardTitle>
                <CardDescription>
                  Health check van database en services
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getOverallBadge()}
                <button 
                  onClick={(e) => { e.stopPropagation(); refetch(); }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  disabled={isFetching}
                >
                  <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
                </button>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Health check uitvoeren...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Kon status niet ophalen</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {error instanceof Error ? error.message : 'Onbekende fout'}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Opnieuw proberen
                    </Button>
                  </div>
                </div>
              </div>
            ) : status ? (
              <div className="space-y-3">
                {/* Database */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.database)}
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Database</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {status.database.message && (
                      <span className="text-muted-foreground">{status.database.message}</span>
                    )}
                    {formatLatency(status.database.latency_ms)}
                  </div>
                </div>

                {/* Auth */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.auth)}
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Authenticatie</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {status.auth.message && (
                      <span className="text-muted-foreground">{status.auth.message}</span>
                    )}
                    {formatLatency(status.auth.latency_ms)}
                  </div>
                </div>

                {/* Edge Functions */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.functions)}
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Edge Functions</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {status.functions.message && (
                      <span className="text-muted-foreground">{status.functions.message}</span>
                    )}
                    {formatLatency(status.functions.latency_ms)}
                  </div>
                </div>

                {/* Last checked */}
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Laatst gecontroleerd: {new Date(status.checked_at).toLocaleTimeString('nl-NL')}
                </p>

                {/* Troubleshooting tips for degraded/down status */}
                {status.overall !== 'healthy' && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-primary">Mogelijke oplossingen:</p>
                        <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                          {status.database.status !== 'ok' && (
                            <li>Database timeout: wacht 2-5 minuten en probeer opnieuw</li>
                          )}
                          {status.database.latency_ms > 3000 && (
                            <li>Trage database: overweeg instance upgrade in Cloud Settings</li>
                          )}
                          {status.functions.status !== 'ok' && (
                            <li>Edge functions niet bereikbaar: controleer netwerkverbinding</li>
                          )}
                          <li>Bij aanhoudende problemen: neem contact op met support</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
