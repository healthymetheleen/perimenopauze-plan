import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  
  if (!isTrialExpired) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full glass-strong rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto p-4 rounded-full bg-destructive/10 w-fit mb-4">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">{t('trial.trial_expired')}</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">{t('trial.trial_expired_desc')}</span>
            <span className="block text-xs text-destructive">
              {t('trial.trial_expired_warning')}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              {t('trial.with_premium')}
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 ml-6">
              {SUBSCRIPTION_PLANS.monthly.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center p-4 bg-primary/5 rounded-lg">
            <p className="text-2xl font-bold text-primary">€{SUBSCRIPTION_PLANS.monthly.price}{t('trial.per_month')}</p>
            <p className="text-sm text-muted-foreground">{t('trial.full_access')}</p>
          </div>

          <Button asChild size="lg" className="w-full btn-gradient">
            <Link to="/subscription">
              <Crown className="h-4 w-4 mr-2" />
              {t('trial.upgrade_to_premium')}
            </Link>
          </Button>

          <div className="text-xs text-center text-muted-foreground space-y-1">
            <p>{t('trial.safe_payment')}</p>
            <p className="text-destructive/70">
              {t('trial.data_warning')}
            </p>
          </div>

          <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
            <Link to="/account">
              {t('trial.or_delete')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function TrialBanner({ daysRemaining }: { daysRemaining: number }) {
  const { t } = useTranslation();
  
  if (daysRemaining <= 0 || daysRemaining > 7) return null;

  const isUrgent = daysRemaining <= 3;
  const dayLabel = daysRemaining === 1 ? t('trial.day') : t('trial.days');

  return (
    <div className={`rounded-lg p-3 mb-4 ${
      isUrgent 
        ? 'bg-amber-500/10 border border-amber-500/20' 
        : 'bg-primary/10 border border-primary/20'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Crown className={`h-4 w-4 ${isUrgent ? 'text-amber-600' : 'text-primary'}`} />
          <span className={`text-sm font-medium ${isUrgent ? 'text-amber-700' : 'text-primary'}`}>
            {t('trial.trial_remaining', { days: daysRemaining, dayLabel })}
          </span>
        </div>
        <Button asChild size="sm" variant="outline" className="text-xs">
          <Link to="/subscription">{t('trial.view_premium')}</Link>
        </Button>
      </div>
    </div>
  );
}
