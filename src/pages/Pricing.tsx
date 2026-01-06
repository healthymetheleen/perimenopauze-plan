import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/hooks/useEntitlements';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  highlighted?: boolean;
  buttonText: string;
  buttonVariant: 'default' | 'outline';
}

const plans: Plan[] = [
  {
    name: 'Proefperiode',
    price: '€0',
    period: '7 dagen',
    description: 'Probeer alle functies 7 dagen gratis uit.',
    features: [
      { text: 'Alle Premium functies', included: true },
      { text: 'AI-maaltijdanalyses', included: true },
      { text: 'Dagelijkse inzichten', included: true },
      { text: 'Trends & patronen', included: true },
      { text: 'Na 7 dagen: upgrade of stop', included: true },
    ],
    buttonText: 'Start gratis proefperiode',
    buttonVariant: 'outline',
  },
  {
    name: 'Premium',
    price: '€7,50',
    period: 'per maand',
    description: 'Speciaal voor vrouwen in de perimenopauze.',
    features: [
      { text: 'Onbeperkte AI-maaltijdanalyses', included: true },
      { text: 'Dagelijkse AI-inzichten & reflecties', included: true },
      { text: 'Maandelijkse totaalanalyse', included: true },
      { text: 'Bewegingsoefeningen op maat', included: true },
      { text: 'Patronen & trends ontdekken', included: true },
      { text: 'Slaap- en symptoomcorrelaties', included: true },
      { text: 'Data export (GDPR)', included: true },
    ],
    highlighted: true,
    buttonText: 'Upgrade naar Premium',
    buttonVariant: 'default',
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { data: entitlements } = useEntitlements();
  const currentPlan = entitlements?.plan || 'free';

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Perimenopauze Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            AI-inzichten afgestemd op jouw cyclus, symptomen en leefstijl.
            Probeer 7 dagen gratis.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const isCurrent = 
              (plan.name === 'Proefperiode' && currentPlan === 'free') ||
              (plan.name === 'Premium' && currentPlan === 'premium');

            return (
              <Card
                key={plan.name}
                className={`rounded-2xl relative ${
                  plan.highlighted
                    ? 'border-2 border-primary shadow-lg'
                    : ''
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Aanbevolen
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-3">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className={`rounded-full p-1 ${
                          feature.included ? 'bg-accent/20' : 'bg-muted'
                        }`}>
                          <Check className={`h-3 w-3 ${
                            feature.included ? 'text-accent-foreground' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <span className={feature.included ? 'text-foreground' : 'text-muted-foreground'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4">
                    {isCurrent && plan.name === 'Premium' ? (
                      <Button variant="outline" className="w-full" disabled>
                        Actief
                      </Button>
                    ) : plan.name === 'Premium' ? (
                      <Button
                        variant={plan.buttonVariant}
                        className="w-full"
                        asChild
                      >
                        <Link to={user ? '/subscription' : '/login'}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          {plan.buttonText}
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/login">Start gratis</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Vragen? Neem contact op via{' '}
            <a href="mailto:healthymetheleen@gmail.com" className="text-primary hover:underline">
              healthymetheleen@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}