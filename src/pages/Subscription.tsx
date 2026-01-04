import { useState } from 'react';
import { 
  CreditCard, Check, Sparkles, Crown, AlertCircle, 
  Loader2, ChevronRight, Building2, ExternalLink
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  useSubscription, 
  useCreatePayment, 
  useCreateIdealPayment,
  useIdealIssuers,
  SUBSCRIPTION_PLANS,
  PAYMENT_METHOD_ICONS
} from '@/hooks/useMollie';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

type PlanId = keyof typeof SUBSCRIPTION_PLANS;
type PaymentMethodType = 'ideal' | 'other';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: subscription, isLoading: loadingSubscription } = useSubscription();
  const { data: idealIssuers, isLoading: loadingIssuers } = useIdealIssuers();
  const createPayment = useCreatePayment();
  const createIdealPayment = useCreateIdealPayment();

  const [selectedPlan, setSelectedPlan] = useState<PlanId>('yearly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('ideal');
  const [selectedIssuer, setSelectedIssuer] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

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
      let result;
      const baseUrl = window.location.origin;

      if (paymentMethod === 'ideal') {
        result = await createIdealPayment.mutateAsync({
          amount: plan.price,
          description: `HormoonBalans ${plan.name} abonnement`,
          redirectUrl: `${baseUrl}/subscription?status=complete`,
          metadata: { plan: plan.id },
          issuer: selectedIssuer || undefined,
        });
      } else {
        result = await createPayment.mutateAsync({
          amount: plan.price,
          description: `HormoonBalans ${plan.name} abonnement`,
          redirectUrl: `${baseUrl}/subscription?status=complete`,
          metadata: { plan: plan.id },
        });
      }

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
            {/* Plan selection */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Kies je plan</h2>
              
              <div className="grid gap-4">
                {Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => (
                  <Card 
                    key={id}
                    className={`cursor-pointer transition-all rounded-2xl ${
                      selectedPlan === id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedPlan(id as PlanId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedPlan === id ? 'border-primary bg-primary' : 'border-muted-foreground'
                          }`}>
                            {selectedPlan === id && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{plan.name}</p>
                              {'savings' in plan && (
                                <Badge variant="secondary" className="text-xs bg-success/20 text-success">
                                  {plan.savings}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                            <ul className="mt-2 space-y-1">
                              {plan.features.map((feature, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Check className="h-3 w-3 text-success" /> {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">€{plan.price}</p>
                          <p className="text-xs text-muted-foreground">
                            {id === 'monthly' ? '/maand' : '/jaar'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Payment method selection */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Betaalmethode</h2>
              
              <RadioGroup 
                value={paymentMethod} 
                onValueChange={(v) => setPaymentMethod(v as PaymentMethodType)}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="ideal"
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'ideal' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="ideal" id="ideal" />
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <span className="font-medium">iDEAL</span>
                  </div>
                </Label>
                
                <Label
                  htmlFor="other"
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'other' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="other" id="other" />
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    <span className="font-medium">Andere methode</span>
                  </div>
                </Label>
              </RadioGroup>

              {/* iDEAL bank selection */}
              {paymentMethod === 'ideal' && (
                <Card className="rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Selecteer je bank (optioneel)</CardTitle>
                    <CardDescription className="text-xs">
                      Of kies je bank in het volgende scherm
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingIssuers ? (
                      <div className="flex items-center gap-2 py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Banken laden...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <Button
                          variant={selectedIssuer === '' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start"
                          onClick={() => setSelectedIssuer('')}
                        >
                          Kies later
                        </Button>
                        {idealIssuers?.map((issuer) => (
                          <Button
                            key={issuer.id}
                            variant={selectedIssuer === issuer.id ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start text-xs"
                            onClick={() => setSelectedIssuer(issuer.id)}
                          >
                            {issuer.name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

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
                  <a href="mailto:support@hormoonbalans.nl" className="text-primary hover:underline">
                    support@hormoonbalans.nl
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
