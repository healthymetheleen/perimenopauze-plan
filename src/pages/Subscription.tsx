import { useState } from 'react';
import { 
  CreditCard, Check, Sparkles, Crown, AlertCircle, 
  Loader2, ChevronRight, XCircle, Clock
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  useSubscription, 
  useCreateFirstPayment,
  SUBSCRIPTION_PLANS
} from '@/hooks/useMollie';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

type PlanId = keyof typeof SUBSCRIPTION_PLANS;

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: subscription, isLoading: loadingSubscription } = useSubscription();
  const createFirstPayment = useCreateFirstPayment();

  const [selectedPlan] = useState<PlanId>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isActive = subscription?.status === 'active';
  const isPremium = isActive && subscription?.plan !== 'free';

  const handleSubscribe = async () => {
    if (!user) {
      toast({ title: 'Je moet ingelogd zijn', variant: 'destructive' });
      return;
    }

    const plan = SUBSCRIPTION_PLANS[selectedPlan];
    setIsProcessing(true);

    try {
      const baseUrl = window.location.origin;

      // Use first-payment flow to establish mandate for recurring
      const result = await createFirstPayment.mutateAsync({
        amount: plan.price,
        description: `Perimenopauze Plan App - ${plan.name}`,
        redirectUrl: `${baseUrl}/subscription?status=complete`,
        metadata: { plan: plan.id },
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Betaling mislukt',
        description: error instanceof Error ? error.message : 'Probeer het opnieuw',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      // Call edge function to cancel Mollie subscription
      const { data, error } = await supabase.functions.invoke('mollie-payments/cancel-subscription');

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Abonnement opgezegd',
        description: 'Je hebt nog toegang tot het einde van je huidige periode.',
      });
      setShowCancelDialog(false);
      // Refetch subscription data
      window.location.reload();
    } catch (error) {
      console.error('Cancel error:', error);
      toast({
        title: 'Opzeggen mislukt',
        description: 'Neem contact op met healthymetheleen@gmail.com',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Check for payment completion status
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('status');

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            Abonnement
          </h1>
          <p className="text-muted-foreground">
            Beheer je HormoonBalans abonnement
          </p>
        </div>

        {/* Payment completion alert */}
        {paymentStatus === 'complete' && (
          <Alert className="bg-success/10 border-success">
            <Check className="h-4 w-4 text-success" />
            <AlertTitle>Betaling verwerkt!</AlertTitle>
            <AlertDescription>
              Je betaling wordt verwerkt. Dit kan enkele minuten duren.
              Refresh de pagina om je abonnementsstatus te zien.
            </AlertDescription>
          </Alert>
        )}

        {/* Current subscription status */}
        <Card className="glass-strong rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Huidige status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSubscription ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Laden...</span>
              </div>
            ) : isPremium ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Premium abonnement</p>
                      <p className="text-sm text-muted-foreground">
                        Plan: {subscription?.plan}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-success text-success-foreground">Actief</Badge>
                </div>
                
                {/* Trial progress if applicable */}
                {subscription?.trial_ends_at && (() => {
                  const trialEndDate = new Date(subscription.trial_ends_at);
                  const startDate = new Date(subscription.created_at);
                  const totalTrialDays = differenceInDays(trialEndDate, startDate);
                  const daysRemaining = Math.max(0, differenceInDays(trialEndDate, new Date()));
                  const trialProgress = totalTrialDays > 0 ? ((totalTrialDays - daysRemaining) / totalTrialDays) * 100 : 100;
                  
                  if (daysRemaining > 0) {
                    return (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-700">
                              Gratis trial: nog {daysRemaining} {daysRemaining === 1 ? 'dag' : 'dagen'}
                            </span>
                          </div>
                          <span className="text-xs text-amber-600">
                            t/m {format(trialEndDate, 'd MMM', { locale: nl })}
                          </span>
                        </div>
                        <Progress value={trialProgress} className="h-2" />
                        <p className="text-xs text-amber-600 mt-2">
                          Na de trial wordt €7,50/maand automatisch afgeschreven
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {subscription?.created_at && (
                  <p className="text-sm text-muted-foreground">
                    Gestart op {format(new Date(subscription.created_at), 'd MMMM yyyy', { locale: nl })}
                  </p>
                )}

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Premium voordelen:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" /> Onbeperkte maaltijdanalyses
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" /> AI-inzichten & reflecties
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" /> Maandelijkse totaalanalyse
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" /> Alle bewegingsoefeningen
                    </li>
                  </ul>
                </div>

                <Separator />

                {/* Cancel subscription button */}
                <Button 
                  variant="outline" 
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Abonnement opzeggen
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Gratis account</p>
                    <p className="text-sm text-muted-foreground">
                      Upgrade naar Premium voor volledige toegang
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade section - only show if not premium */}
        {!isPremium && (
          <>
            {/* Trial info and pricing */}
            <Card className="glass-strong rounded-2xl bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-primary/20">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">7 dagen gratis</p>
                    <p className="text-muted-foreground">Daarna €7,50 per maand</p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <ul className="space-y-2">
                  {SUBSCRIPTION_PLANS.monthly.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success flex-shrink-0" /> 
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>


            {/* Subscribe button */}
            <Button
              size="lg"
              className="w-full btn-gradient text-primary-foreground"
              onClick={handleSubscribe}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verwerken...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade naar Premium - €{SUBSCRIPTION_PLANS[selectedPlan].price}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            {/* Payment info */}
            <p className="text-xs text-center text-muted-foreground">
              Veilig betalen via Mollie. Je wordt doorgestuurd naar de betaalpagina.
            </p>
          </>
        )}

        {/* Help section */}
        <Card className="rounded-xl bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Vragen over je abonnement?</p>
                <p>
                  Neem contact op via{' '}
                  <a href="mailto:healthymetheleen@gmail.com" className="text-primary hover:underline">
                    healthymetheleen@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Abonnement opzeggen?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Als je je abonnement opzegt, verlies je toegang tot:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Onbeperkte maaltijdanalyses</li>
                <li>AI-inzichten & reflecties</li>
                <li>Maandelijkse totaalanalyse</li>
                <li>Alle bewegingsoefeningen</li>
              </ul>
              <p className="text-sm pt-2">
                Je kunt later altijd weer opnieuw abonneren.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opzeggen...
                </>
              ) : (
                'Ja, opzeggen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
