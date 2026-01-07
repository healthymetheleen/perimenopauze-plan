import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles, Mail, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { ContactFormDialog } from '@/components/contact/ContactFormDialog';
import { FeedbackFormDialog } from '@/components/contact/FeedbackFormDialog';

export default function PricingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: entitlements } = useEntitlements();
  const currentPlan = entitlements?.plan || 'free';
  const isPremium = currentPlan === 'premium' && entitlements?.status === 'active';

  const trialFeatures = t('pricing.trial.features', { returnObjects: true }) as string[];
  const premiumFeatures = t('pricing.premium.features', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {t('pricing.title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Trial Plan */}
          <Card className="rounded-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">{t('pricing.trial.name')}</CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-bold">{t('pricing.trial.price')}</span>
                <span className="text-muted-foreground ml-2">{t('pricing.trial.period')}</span>
              </div>
              <CardDescription className="mt-3">{t('pricing.trial.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {trialFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="rounded-full p-1 bg-accent/20">
                      <Check className="h-3 w-3 text-accent-foreground" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login">{t('pricing.start_free')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="rounded-2xl relative border-2 border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {t('pricing.recommended')}
              </span>
            </div>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">{t('pricing.premium.name')}</CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-bold">{t('pricing.premium.price')}</span>
                <span className="text-muted-foreground ml-2">{t('pricing.premium.period')}</span>
              </div>
              <CardDescription className="mt-3">{t('pricing.premium.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {premiumFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="rounded-full p-1 bg-accent/20">
                      <Check className="h-3 w-3 text-accent-foreground" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4">
                {isPremium ? (
                  <Button variant="outline" className="w-full" disabled>
                    {t('pricing.active')}
                  </Button>
                ) : (
                  <Button className="w-full" asChild>
                    <Link to={user ? '/subscription' : '/login'}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t('pricing.premium.button')}
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI limit disclaimer */}
        <p className="text-xs text-muted-foreground text-center my-6">
          {t('pricing.ai_disclaimer')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <ContactFormDialog 
            trigger={
              <Button variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                {t('pricing.questions')}
              </Button>
            }
          />
          <FeedbackFormDialog 
            trigger={
              <Button variant="ghost" className="gap-2 text-muted-foreground">
                <Lightbulb className="h-4 w-4" />
                {t('pricing.suggestions')}
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}