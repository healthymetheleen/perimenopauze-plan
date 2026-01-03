import { AppLayout } from '@/components/layout/AppLayout';
import { PaywallCard } from '@/components/ui/paywall-card';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFeatureAccess } from '@/hooks/useEntitlements';
import { Activity, Brain, Moon, Flame, Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface SymptomPattern {
  symptom_code: string;
  label_nl: string;
  domain: string;
  days_high_severity: number;
  days_low_severity: number;
  avg_protein_high_severity: number | null;
  avg_protein_low_severity: number | null;
  late_eating_pct_high: number | null;
}

const domainIcons: Record<string, React.ReactNode> = {
  vasomotor: <Flame className="h-4 w-4" />,
  sleep: <Moon className="h-4 w-4" />,
  mood: <Heart className="h-4 w-4" />,
  cognitive: <Brain className="h-4 w-4" />,
  energy: <Activity className="h-4 w-4" />,
};

const domainColors: Record<string, string> = {
  vasomotor: 'bg-domain-vasomotor/20',
  sleep: 'bg-domain-sleep/20',
  mood: 'bg-domain-mood/20',
  cognitive: 'bg-domain-cognitive/20',
  energy: 'bg-domain-energy/20',
  metabolic: 'bg-domain-metabolic/20',
  menstrual: 'bg-domain-menstrual/20',
  digestive: 'bg-domain-digestive/20',
  urogenital: 'bg-domain-urogenital/20',
  dermatological: 'bg-domain-dermatological/20',
};

export default function PatternsPage() {
  const { user } = useAuth();
  const { hasAccess, isLoading: accessLoading } = useFeatureAccess('patterns');

  // For now, patterns feature is behind paywall - show placeholder
  const patterns: SymptomPattern[] = [];
  const patternsLoading = false;

  if (accessLoading) {
    return (
      <AppLayout>
        <LoadingState message="Toegang controleren..." />
      </AppLayout>
    );
  }

  if (!hasAccess) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-12">
          <PaywallCard
            feature="Patroonherkenning"
            description="Ontdek verbanden tussen je eetpatroon en hoe je je voelt."
            benefits={[
              'Correlatie tussen voeding en symptomen',
              'Inzicht in triggers',
              'Persoonlijke observaties',
            ]}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Patronen</h1>
          <p className="text-muted-foreground">
            Mogelijke verbanden tussen je eetpatroon en symptomen (14 dagen)
          </p>
        </div>

        {patternsLoading ? (
          <LoadingState />
        ) : !patterns?.length ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12">
              <EmptyState
                icon={<Activity className="h-10 w-10" />}
                title="Nog geen patronen gevonden"
                description="Registreer minstens 2 weken data om patronen te ontdekken."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {patterns.map((pattern) => {
              const proteinDiff =
                pattern.avg_protein_low_severity && pattern.avg_protein_high_severity
                  ? pattern.avg_protein_low_severity - pattern.avg_protein_high_severity
                  : null;

              return (
                <Card key={pattern.symptom_code} className="rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className={`p-1.5 rounded-full ${domainColors[pattern.domain] || 'bg-muted'}`}>
                        {domainIcons[pattern.domain] || <Activity className="h-4 w-4" />}
                      </span>
                      {pattern.label_nl}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Intensief: {pattern.days_high_severity} dagen
                      </span>
                      <span className="text-muted-foreground">
                        Mild: {pattern.days_low_severity} dagen
                      </span>
                    </div>
                    {proteinDiff && proteinDiff > 10 && (
                      <div className="p-3 rounded-lg bg-accent/10 text-sm">
                        <p className="font-medium">Observatie: eiwitinname</p>
                        <p className="text-muted-foreground mt-1">
                          Op dagen met milde klachten was je eiwitinname gemiddeld{' '}
                          {Math.round(proteinDiff)}g hoger.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Deze observaties suggereren mogelijke verbanden. Ze vormen geen medisch advies.
        </p>
      </div>
    </AppLayout>
  );
}
