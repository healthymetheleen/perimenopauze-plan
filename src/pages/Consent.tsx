import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConsent } from '@/hooks/useConsent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoadingPage } from '@/components/ui/loading-state';
import { useToast } from '@/hooks/use-toast';
import { Shield, FileText, AlertTriangle, Heart, Loader2 } from 'lucide-react';

interface ConsentItem {
  key: 'accepted_privacy' | 'accepted_terms' | 'accepted_disclaimer' | 'accepted_health_data_processing';
  icon: React.ReactNode;
  title: string;
  description: string;
  required: boolean;
}

const consentItems: ConsentItem[] = [
  {
    key: 'accepted_privacy',
    icon: <Shield className="h-5 w-5 text-primary" />,
    title: 'Privacybeleid',
    description: 'Je gegevens worden veilig opgeslagen en nooit gedeeld met derden zonder jouw toestemming.',
    required: true,
  },
  {
    key: 'accepted_terms',
    icon: <FileText className="h-5 w-5 text-primary" />,
    title: 'Algemene voorwaarden',
    description: 'Je gaat akkoord met de gebruiksvoorwaarden van HormoonBalans Dagboek.',
    required: true,
  },
  {
    key: 'accepted_disclaimer',
    icon: <AlertTriangle className="h-5 w-5 text-warning" />,
    title: 'Medische disclaimer',
    description: 'Deze app vervangt geen medisch advies. Raadpleeg altijd een zorgverlener voor medische vragen.',
    required: true,
  },
  {
    key: 'accepted_health_data_processing',
    icon: <Heart className="h-5 w-5 text-secondary" />,
    title: 'Verwerking gezondheidsgegevens',
    description: 'Je geeft toestemming om je eetpatroon en symptomen te verwerken om patronen te herkennen.',
    required: true,
  },
];

export default function ConsentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { consent, isLoading, updateConsent, hasCompletedConsent } = useConsent();
  
  const [accepted, setAccepted] = useState<Record<string, boolean>>({
    accepted_privacy: false,
    accepted_terms: false,
    accepted_disclaimer: false,
    accepted_health_data_processing: false,
  });

  // Redirect if already consented
  if (hasCompletedConsent) {
    navigate('/dashboard');
    return null;
  }

  if (isLoading) {
    return <LoadingPage />;
  }

  const allRequired = consentItems
    .filter(item => item.required)
    .every(item => accepted[item.key]);

  const handleSubmit = async () => {
    updateConsent.mutate(
      {
        accepted_privacy: accepted.accepted_privacy,
        accepted_terms: accepted.accepted_terms,
        accepted_disclaimer: accepted.accepted_disclaimer,
        accepted_health_data_processing: accepted.accepted_health_data_processing,
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welkom bij HormoonBalans</CardTitle>
          <CardDescription className="text-base">
            Voordat je begint, vragen we je om akkoord te gaan met onderstaande punten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          ))}

          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!allRequired || updateConsent.isPending}
              className="w-full"
              size="lg"
            >
              {updateConsent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Akkoord en doorgaan
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-3">
              * Verplichte velden
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}