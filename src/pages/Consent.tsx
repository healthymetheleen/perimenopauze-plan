import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useConsent, CONSENT_VERSION, PRIVACY_POLICY_VERSION, TERMS_VERSION } from '@/hooks/useConsent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoadingPage } from '@/components/ui/loading-state';
import { useToast } from '@/hooks/use-toast';
import { Shield, FileText, AlertTriangle, Heart, Loader2, Sparkles, Info, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConsentItem {
  key: 'accepted_privacy' | 'accepted_terms' | 'accepted_disclaimer' | 'accepted_health_data_processing' | 'accepted_ai_processing';
  icon: React.ReactNode;
  title: string;
  description: string;
  required: boolean;
  linkTo?: string;
}

const consentItems: ConsentItem[] = [
  {
    key: 'accepted_privacy',
    icon: <Shield className="h-5 w-5 text-primary" />,
    title: 'Privacybeleid',
    description: 'Je gegevens worden veilig opgeslagen in de EU en nooit verkocht aan derden.',
    required: true,
    linkTo: '/privacy',
  },
  {
    key: 'accepted_terms',
    icon: <FileText className="h-5 w-5 text-primary" />,
    title: 'Algemene voorwaarden',
    description: 'Je gaat akkoord met de gebruiksvoorwaarden van Perimenopauze Plan.',
    required: true,
    linkTo: '/terms',
  },
  {
    key: 'accepted_disclaimer',
    icon: <AlertTriangle className="h-5 w-5 text-warning" />,
    title: 'Medische disclaimer',
    description: 'Deze app vervangt geen medisch advies. Raadpleeg altijd een zorgverlener voor medische vragen.',
    required: true,
    linkTo: '/intended-use',
  },
  {
    key: 'accepted_health_data_processing',
    icon: <Heart className="h-5 w-5 text-secondary" />,
    title: 'Verwerking gezondheidsgegevens',
    description: 'Je geeft toestemming om je eetpatroon, cyclus en symptomen te verwerken om patronen te herkennen. Je kunt je data op elk moment exporteren of verwijderen.',
    required: true,
  },
  {
    key: 'accepted_ai_processing',
    icon: <Sparkles className="h-5 w-5 text-accent" />,
    title: 'AI-ondersteuning',
    description: 'Je geeft toestemming voor AI-analyse om gepersonaliseerde tips te geven. AI ontvangt alleen geanonimiseerde statistieken, geen herleidbare persoonsgegevens.',
    required: false,
  },
];

export default function ConsentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoading, updateConsent, hasCompletedConsent } = useConsent();

  const [accepted, setAccepted] = useState<Record<string, boolean>>({
    accepted_privacy: false,
    accepted_terms: false,
    accepted_disclaimer: false,
    accepted_health_data_processing: false,
    accepted_ai_processing: false,
  });

  React.useEffect(() => {
    if (hasCompletedConsent) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasCompletedConsent, navigate]);

  if (isLoading || hasCompletedConsent) {
    return <LoadingPage />;
  }

  const allRequired = consentItems
    .filter((item) => item.required)
    .every((item) => accepted[item.key]);

  const handleSubmit = async () => {
    updateConsent.mutate(
      {
        accepted_privacy: accepted.accepted_privacy,
        accepted_terms: accepted.accepted_terms,
        accepted_disclaimer: accepted.accepted_disclaimer,
        accepted_health_data_processing: accepted.accepted_health_data_processing,
        accepted_ai_processing: accepted.accepted_ai_processing,
        accepted_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast({
            title: 'Welkom!',
            description: 'Je kunt nu beginnen met je dagboek.',
          });
          navigate('/dashboard');
        },
        onError: () => {
          toast({
            title: 'Er ging iets mis',
            description: 'Probeer het opnieuw.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4 py-8">
      <Card className="w-full max-w-lg glass-strong rounded-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/favicon.svg" alt="Logo" className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl text-gradient">Welkom bij Perimenopauze Plan</CardTitle>
          <CardDescription className="text-base">
            Voordat je begint, vragen we je om akkoord te gaan met onderstaande punten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-info/10 border-info/30">
            <Info className="h-4 w-4 text-info" />
            <AlertDescription className="text-sm">
              Wij nemen je privacy serieus. Je gegevens worden alleen gebruikt om jou te helpen 
              en nooit gedeeld met derden. Je kunt je data op elk moment downloaden of verwijderen.
            </AlertDescription>
          </Alert>

          {consentItems.map((item) => (
            <div key={item.key} className="flex items-start space-x-4">
              <Checkbox
                id={item.key}
                checked={accepted[item.key]}
                onCheckedChange={(checked) =>
                  setAccepted((prev) => ({ ...prev, [item.key]: !!checked }))
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor={item.key}
                  className="flex items-center gap-2 text-base font-medium cursor-pointer"
                >
                  {item.icon}
                  {item.title}
                  {item.required && <span className="text-destructive">*</span>}
                  {!item.required && (
                    <span className="text-xs text-muted-foreground">(optioneel)</span>
                  )}
                  {item.linkTo && (
                    <Link 
                      to={item.linkTo} 
                      target="_blank" 
                      className="text-primary hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              </div>
            </div>
          ))}

          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!allRequired || updateConsent.isPending}
              className="w-full btn-gradient"
              size="lg"
            >
              {updateConsent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Akkoord en doorgaan
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-3">
              * Verplichte velden · Versie {CONSENT_VERSION}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
