import { differenceInDays, addDays, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Clock, Sparkles, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/hooks/useMollie';
import { useEntitlements } from '@/hooks/useEntitlements';

const TRIAL_DAYS = 7;

export function TrialCountdown() {
  const { data: subscription } = useSubscription();
  const { data: entitlements } = useEntitlements();

  const isPremium = entitlements?.can_use_trends || entitlements?.can_use_patterns;
  
  // If no subscription or not premium, don't show countdown
  if (!subscription?.created_at || !isPremium) return null;
  
  const startDate = new Date(subscription.created_at);
  const trialEndDate = addDays(startDate, TRIAL_DAYS);
  const today = new Date();
  const daysRemaining = Math.max(0, differenceInDays(trialEndDate, today));
  const trialProgress = ((TRIAL_DAYS - daysRemaining) / TRIAL_DAYS) * 100;
  
  // Trial is over
  if (daysRemaining <= 0) return null;

  return (
    <Link to="/subscription">
      <Card className="glass rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 hover:shadow-soft transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/20">
              {daysRemaining <= 2 ? (
                <Clock className="h-5 w-5 text-primary" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-foreground">
                  {daysRemaining === 1 
                    ? 'Nog 1 dag gratis trial' 
                    : `Nog ${daysRemaining} dagen gratis trial`}
                </p>
                <span className="text-xs text-muted-foreground">
                  t/m {format(trialEndDate, 'd MMM', { locale: nl })}
                </span>
              </div>
              <Progress value={trialProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {daysRemaining <= 2 
                  ? 'Daarna €4,50/maand via automatische incasso'
                  : 'Premium toegang actief'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function TrialBadge() {
  const { data: subscription } = useSubscription();
  const { data: entitlements } = useEntitlements();

  const isPremium = entitlements?.can_use_trends || entitlements?.can_use_patterns;
  
  if (!subscription?.created_at || !isPremium) return null;
  
  const startDate = new Date(subscription.created_at);
  const trialEndDate = addDays(startDate, TRIAL_DAYS);
  const today = new Date();
  const daysRemaining = Math.max(0, differenceInDays(trialEndDate, today));
  
  if (daysRemaining <= 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
        <Crown className="h-3 w-3" />
        Premium
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
      daysRemaining <= 2 
        ? 'bg-muted text-foreground' 
        : 'bg-primary/10 text-primary'
    }`}>
      {daysRemaining <= 2 ? (
        <Clock className="h-3 w-3" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      Trial: {daysRemaining}d
    </div>
  );
}
