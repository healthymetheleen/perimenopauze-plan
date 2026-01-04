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
    name: 'Gratis',
    price: '€0',
    period: 'voor altijd',
    description: 'Begin met je dagboek en ontdek de basis.',
    features: [
      { text: 'Dagelijks eetdagboek', included: true },
      { text: 'Klachten bijhouden', included: true },
      { text: 'Dagelijkse samenvatting', included: true },
      { text: '7 dagen historie', included: true },
      { text: 'Trends en inzichten', included: false },
      { text: 'Patroonherkenning', included: false },
      { text: 'Data export', included: false },
    ],
    buttonText: 'Huidige plan',
    buttonVariant: 'outline',
  },
  {
    name: 'Premium',
    price: '€9,99',
    period: 'per maand',
    description: 'Krijg meer inzicht in je leefstijl- en welzijnspatronen.',
    features: [
      { text: 'Dagelijks eetdagboek', included: true },
      { text: 'Klachten bijhouden', included: true },
      { text: 'Dagelijkse samenvatting', included: true },
      { text: '90 dagen historie', included: true },
      { text: 'Trends en inzichten', included: true },
      { text: 'Patroonherkenning', included: true },
      { text: 'Data export (GDPR)', included: true },
    ],
    highlighted: true,
    buttonText: 'Start 7 dagen gratis',
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
            Kies je plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Begin gratis en upgrade wanneer je klaar bent voor meer inzicht in je patronen.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const isCurrent = 
              (plan.name === 'Gratis' && currentPlan === 'free') ||
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
                      Populair
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
                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>
                        {plan.name === 'Premium' ? 'Actief' : 'Huidige plan'}
                      </Button>
                    ) : plan.name === 'Premium' ? (
                      <Button
                        variant={plan.buttonVariant}
                        className="w-full"
                        asChild
                      >
                        <Link to={user ? '/checkout' : '/login'}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          {plan.buttonText}
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/login">Aan de slag</Link>
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