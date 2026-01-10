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
  status: 'ok' | 'warning' | 'error' | 'timeout';
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

const REQUEST_TIMEOUT = 5000; // 5 seconds timeout

async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<{ result: T | null; timedOut: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Request timeout'));
        });
      }),
    ]);
    clearTimeout(timeoutId);
    return { result, timedOut: false };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.message === 'Request timeout') {
      return { result: null, timedOut: true };
    }
    throw error;
  }
}

export function BackendStatusPanel() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const { data: status, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['backend-health'],
    queryFn: async (): Promise<BackendStatus> => {
      const results: BackendStatus = {
        database: { status: 'error', latency_ms: 0 },
        auth: { status: 'error', latency_ms: 0 },
        functions: { status: 'error', latency_ms: 0 },
        overall: 'down',
        checked_at: new Date().toISOString(),
      };

      // Check database connection with timeout (simple count query - no PII)
      try {
        const dbStart = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        
        const dbPromise = supabase
          .from('affiliate_products')
          .select('id', { count: 'exact', head: true })
          .limit(1)
          .abortSignal(controller.signal);
        
        const { error: dbError } = await dbPromise;
        clearTimeout(timeoutId);
        const dbLatency = Date.now() - dbStart;
        
        if (dbError) {
          const isTimeout = dbError.message?.includes('abort') || dbError.code === 'PGRST301';
          results.database = { 
            status: isTimeout ? 'timeout' : 'error', 
            latency_ms: dbLatency, 
            message: isTimeout ? t('admin.backendStatus.timeoutMessage', 'Connection timeout') : dbError.message 
          };
        } else if (dbLatency > 3000) {
          results.database = { status: 'warning', latency_ms: dbLatency, message: t('admin.backendStatus.slowResponse', 'Slow response') };
        } else {
          results.database = { status: 'ok', latency_ms: dbLatency };
        }
      } catch (e) {
        const isAbort = e instanceof Error && e.name === 'AbortError';
        results.database = { 
          status: isAbort ? 'timeout' : 'error', 
          latency_ms: REQUEST_TIMEOUT, 
          message: isAbort ? t('admin.backendStatus.timeoutMessage', 'Connection timeout') : (e instanceof Error ? e.message : t('admin.backendStatus.connectionFailed', 'Connection failed'))
        };
      }

      // Check auth service with timeout
      try {
        const authStart = Date.now();
        const { timedOut } = await fetchWithTimeout(
          supabase.auth.getSession(),
          REQUEST_TIMEOUT
        );
        const authLatency = Date.now() - authStart;
        
        if (timedOut) {
          results.auth = { status: 'timeout', latency_ms: authLatency, message: t('admin.backendStatus.timeoutMessage', 'Connection timeout') };
        } else if (authLatency > 2000) {
          results.auth = { status: 'warning', latency_ms: authLatency, message: t('admin.backendStatus.slowResponse', 'Slow response') };
        } else {
          results.auth = { status: 'ok', latency_ms: authLatency };
        }
      } catch (e) {
        results.auth = { 
          status: 'error', 
          latency_ms: 0, 
          message: e instanceof Error ? e.message : t('admin.backendStatus.authCheckFailed', 'Auth check failed') 
        };
      }

      // Check edge functions with timeout
      try {
        const fnStart = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/`, {
          method: 'HEAD',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const fnLatency = Date.now() - fnStart;
        
        if (response.status === 404 || response.status === 200) {
          if (fnLatency > 2000) {
            results.functions = { status: 'warning', latency_ms: fnLatency, message: t('admin.backendStatus.slowResponse', 'Slow response') };
          } else {
            results.functions = { status: 'ok', latency_ms: fnLatency };
          }
        } else {
          results.functions = { status: 'warning', latency_ms: fnLatency, message: `Status ${response.status}` };
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          results.functions = { status: 'timeout', latency_ms: REQUEST_TIMEOUT, message: t('admin.backendStatus.timeoutMessage', 'Connection timeout') };
        } else {
          results.functions = { 
            status: 'error', 
            latency_ms: 0, 
            message: e instanceof Error ? e.message : t('admin.backendStatus.functionsUnreachable', 'Functions unreachable') 
          };
        }
      }

      // Calculate overall status
      const statuses = [results.database.status, results.auth.status, results.functions.status];
      if (statuses.every(s => s === 'ok')) {
        results.overall = 'healthy';
      } else if (statuses.some(s => s === 'error' || s === 'timeout')) {
        results.overall = 'down';
      } else {
        results.overall = 'degraded';
      }

      return results;
    },
    refetchInterval: 60000,
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
      case 'timeout':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getOverallBadge = () => {
    if (isLoading || error) {
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {t('admin.backendStatus.checking', 'Checking...')}</Badge>;
    }
    
    switch (status?.overall) {
      case 'healthy':
        return <Badge variant="default" className="gap-1 bg-success text-success-foreground"><CheckCircle className="h-3 w-3" /> {t('admin.backendStatus.healthy', 'Healthy')}</Badge>;
      case 'degraded':
        return <Badge variant="default" className="gap-1 bg-warning text-warning-foreground"><AlertTriangle className="h-3 w-3" /> {t('admin.backendStatus.degraded', 'Degraded')}</Badge>;
      case 'down':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> {t('admin.backendStatus.issues', 'Issues')}</Badge>;
      default:
        return <Badge variant="secondary">{t('admin.backendStatus.unknown', 'Unknown')}</Badge>;
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
                  {t('admin.backendStatus.title', 'Backend Status')}
                </CardTitle>
                <CardDescription>
                  {t('admin.backendStatus.description', 'Health check of database and services')}
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
                <span className="text-sm">{t('admin.backendStatus.runningCheck', 'Running health check...')}</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">{t('admin.backendStatus.couldNotFetch', 'Could not fetch status')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {error instanceof Error ? error.message : t('admin.backendStatus.unknownError', 'Unknown error')}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('admin.backendStatus.retry', 'Try again')}
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
                      <span className="font-medium">{t('admin.backendStatus.database', 'Database')}</span>
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
                      <span className="font-medium">{t('admin.backendStatus.auth', 'Authentication')}</span>
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
                      <span className="font-medium">{t('admin.backendStatus.functions', 'Backend Functions')}</span>
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
                  {t('admin.backendStatus.lastChecked', 'Last checked')}: {new Date(status.checked_at).toLocaleTimeString()}
                </p>

                {/* Troubleshooting tips for degraded/down status */}
                {status.overall !== 'healthy' && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-primary">{t('admin.backendStatus.possibleSolutions', 'Possible solutions')}:</p>
                        <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                          {(status.database.status === 'timeout' || status.database.status === 'error') && (
                            <li>{t('admin.backendStatus.tipDatabaseTimeout', 'Database timeout: wait 2-5 minutes and try again')}</li>
                          )}
                          {status.database.latency_ms > 3000 && status.database.status === 'warning' && (
                            <li>{t('admin.backendStatus.tipSlowDatabase', 'Slow database: consider instance upgrade')}</li>
                          )}
                          {(status.functions.status === 'timeout' || status.functions.status === 'error') && (
                            <li>{t('admin.backendStatus.tipFunctionsUnreachable', 'Functions unreachable: check network connection')}</li>
                          )}
                          <li>{t('admin.backendStatus.tipContactSupport', 'For persistent issues: contact support')}</li>
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
