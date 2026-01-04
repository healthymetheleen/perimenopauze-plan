import { Link } from 'react-router-dom';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SUBSCRIPTION_PLANS } from '@/hooks/useMollie';

interface TrialLockoutProps {
  children: React.ReactNode;
  isTrialExpired: boolean;
  trialDaysRemaining?: number;
}

export function TrialLockout({ children, isTrialExpired, trialDaysRemaining }: TrialLockoutProps) {
  if (!isTrialExpired) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full glass-strong rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Je proefperiode is verlopen</CardTitle>
          <CardDescription>
            Je 7 dagen gratis proberen zijn voorbij. Upgrade naar Premium om door te gaan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Met Premium krijg je:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 ml-6">
              {SUBSCRIPTION_PLANS.monthly.features.slice(1).map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center p-4 bg-primary/5 rounded-lg">
            <p className="text-2xl font-bold text-primary">€{SUBSCRIPTION_PLANS.monthly.price}/maand</p>
            <p className="text-sm text-muted-foreground">Direct toegang na betaling</p>
          </div>

          <Button asChild size="lg" className="w-full btn-gradient">
            <Link to="/subscription">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade naar Premium
            </Link>
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Veilig betalen via Mollie. Elk moment opzegbaar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function TrialBanner({ daysRemaining }: { daysRemaining: number }) {
  if (daysRemaining <= 0 || daysRemaining > 3) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-700">
            Nog {daysRemaining} {daysRemaining === 1 ? 'dag' : 'dagen'} gratis proberen
          </span>
        </div>
        <Button asChild size="sm" variant="outline" className="text-xs">
          <Link to="/subscription">Upgraden</Link>
        </Button>
      </div>
    </div>
  );
}
