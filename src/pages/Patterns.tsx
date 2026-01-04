import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Brain, Moon, Flame, Heart, Utensils, Zap, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useDailyScores } from '@/hooks/useDiary';
import { useSleepSessions, calculateSleepStats } from '@/hooks/useSleep';
import { useLatestPrediction, seasonLabels } from '@/hooks/useCycle';

const domainIcons: Record<string, React.ReactNode> = {
  vasomotor: <Flame className="h-4 w-4" />,
  sleep: <Moon className="h-4 w-4" />,
  mood: <Heart className="h-4 w-4" />,
  cognitive: <Brain className="h-4 w-4" />,
  energy: <Zap className="h-4 w-4" />,
  food: <Utensils className="h-4 w-4" />,
};

const domainColors: Record<string, string> = {
  vasomotor: 'bg-orange-100 dark:bg-orange-950/50',
  sleep: 'bg-indigo-100 dark:bg-indigo-950/50',
  mood: 'bg-pink-100 dark:bg-pink-950/50',
  cognitive: 'bg-purple-100 dark:bg-purple-950/50',
  energy: 'bg-yellow-100 dark:bg-yellow-950/50',
  food: 'bg-green-100 dark:bg-green-950/50',
};

interface PatternInsight {
  domain: string;
  title: string;
  observation: string;
  context?: string;
}

export default function PatternsPage() {
  const { user } = useAuth();
  const { data: scores, isLoading: scoresLoading } = useDailyScores(14);
  const { data: sleepSessions, isLoading: sleepLoading } = useSleepSessions(14);
  const { data: prediction } = useLatestPrediction();
  
  // Fetch symptoms data
  const { data: symptoms, isLoading: symptomsLoading } = useQuery({
    queryKey: ['symptoms-patterns', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const { data, error } = await supabase
        .from('symptoms')
        .select(`
          *,
          symptom_catalog:symptom_code(code, label_nl, domain)
        `)
        .eq('owner_id', user.id)
        .gte('created_at', fourteenDaysAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch cycle symptom logs for hormonal patterns
  const { data: cycleLogs, isLoading: cycleLogsLoading } = useQuery({
    queryKey: ['cycle-symptoms-patterns', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const { data, error } = await supabase
        .from('cycle_symptom_logs')
        .select('*')
        .eq('owner_id', user.id)
        .gte('log_date', fourteenDaysAgo.toISOString().split('T')[0])
        .order('log_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const isLoading = scoresLoading || sleepLoading || symptomsLoading || cycleLogsLoading;
  const sleepStats = sleepSessions ? calculateSleepStats(sleepSessions) : null;
  const currentSeason = prediction?.current_season || 'onbekend';

  // Generate pattern insights based on data
  const patterns: PatternInsight[] = [];

  if (scores && scores.length >= 3) {
    // Analyze protein patterns
    const avgProtein = scores.reduce((sum, s) => sum + (s.protein_g || 0), 0) / scores.length;
    const lowProteinDays = scores.filter(s => (s.protein_g || 0) < 60);
    const highProteinDays = scores.filter(s => (s.protein_g || 0) >= 80);

    if (lowProteinDays.length > scores.length / 2) {
      patterns.push({
        domain: 'food',
        title: 'Eiwitinname patroon',
        observation: `Op ${lowProteinDays.length} van de ${scores.length} dagen was je eiwitinname onder 60g.`,
        context: 'Veel vrouwen in de perimenopauze merken dat voldoende eiwit (80-100g/dag) helpt bij energiebehoud en spieronderhoud.',
      });
    }

    // Analyze fiber patterns
    const avgFiber = scores.reduce((sum, s) => sum + (s.fiber_g || 0), 0) / scores.length;
    if (avgFiber < 20) {
      patterns.push({
        domain: 'food',
        title: 'Vezelpatroon',
        observation: `Je gemiddelde vezelinname is ${Math.round(avgFiber)}g per dag.`,
        context: 'Vezels ondersteunen je darmen en kunnen helpen bij het afvoeren van overtollige hormonen. Streef naar 25-30g.',
      });
    }

    // Analyze meal timing
    const lateMealDays = scores.filter(s => {
      const reasons = s.score_reasons || [];
      return reasons.includes('late_eating');
    });
    
    if (lateMealDays.length >= 3) {
      patterns.push({
        domain: 'food',
        title: 'Laat eten patroon',
        observation: `Op ${lateMealDays.length} dagen at je laat (na 21:00).`,
        context: 'Laat eten kan je slaapkwaliteit beïnvloeden. Veel vrouwen ervaren betere slaap als ze 2-3 uur voor bedtijd stoppen met eten.',
      });
    }
  }

  // Sleep patterns
  if (sleepStats && sleepStats.totalSessions >= 3) {
    if (sleepStats.avgDurationHours < 7) {
      patterns.push({
        domain: 'sleep',
        title: 'Slaappatroon',
        observation: `Je gemiddelde slaapduur is ${sleepStats.avgDurationHours.toFixed(1)} uur.`,
        context: 'In de perimenopauze is 7-8 uur slaap extra belangrijk voor hormoonstabiliteit en herstel.',
      });
    }

    if (sleepStats.avgQuality && sleepStats.avgQuality < 6) {
      patterns.push({
        domain: 'sleep',
        title: 'Slaapkwaliteit',
        observation: `Je gemiddelde slaapkwaliteit is ${sleepStats.avgQuality.toFixed(1)}/10.`,
        context: 'Lichte of onderbroken slaap komt vaker voor in de perimenopauze. Factoren als cafeïne, laat eten en stress kunnen een rol spelen.',
      });
    }
  }

  // Cycle symptom patterns
  if (cycleLogs && cycleLogs.length >= 3) {
    const avgEnergy = cycleLogs.filter(l => l.energy).reduce((sum, l) => sum + (l.energy || 0), 0) / 
                      cycleLogs.filter(l => l.energy).length || 0;
    const avgMood = cycleLogs.filter(l => l.mood).reduce((sum, l) => sum + (l.mood || 0), 0) /
                    cycleLogs.filter(l => l.mood).length || 0;
    
    const headacheDays = cycleLogs.filter(l => l.headache).length;
    const hotFlashDays = cycleLogs.filter(l => l.hot_flashes).length;
    const bloatingDays = cycleLogs.filter(l => l.bloating).length;
    const anxietyDays = cycleLogs.filter(l => l.anxiety).length;

    if (headacheDays >= 3) {
      patterns.push({
        domain: 'vasomotor',
        title: 'Hoofdpijn patroon',
        observation: `Je noteerde hoofdpijn op ${headacheDays} van de ${cycleLogs.length} dagen.`,
        context: currentSeason !== 'onbekend' 
          ? `In de ${seasonLabels[currentSeason]} fase ervaren sommige vrouwen vaker hoofdpijn door hormonale schommelingen.`
          : 'Hoofdpijn kan samenhangen met hormonale schommelingen, voeding, slaap of stress.',
      });
    }

    if (hotFlashDays >= 2) {
      patterns.push({
        domain: 'vasomotor',
        title: 'Opvliegers patroon',
        observation: `Op ${hotFlashDays} dagen ervoer je opvliegers of nachtzweten.`,
        context: 'Dit zijn typische perimenopauze signalen. Voeding (minder suiker, alcohol, gekruid eten) en temperatuurbeheersing kunnen helpen.',
      });
    }

    if (anxietyDays >= 3) {
      patterns.push({
        domain: 'mood',
        title: 'Onrust patroon',
        observation: `Je noteerde onrust of angst op ${anxietyDays} dagen.`,
        context: 'Hormonale veranderingen kunnen je stressrespons beïnvloeden. Ademhalingsoefeningen en rustmomenten kunnen verlichting geven.',
      });
    }

    if (avgEnergy > 0 && avgEnergy < 5) {
      patterns.push({
        domain: 'energy',
        title: 'Energiepatroon',
        observation: `Je gemiddelde energie was ${avgEnergy.toFixed(1)}/10 afgelopen 2 weken.`,
        context: 'Lage energie kan samenhangen met slaap, voeding (met name eiwit en ijzer) en hormonale fluctuaties.',
      });
    }
  }

  // Cross-domain patterns (food + sleep + symptoms)
  if (scores && sleepSessions && scores.length >= 5 && sleepSessions.length >= 3) {
    const goodSleepDays = sleepSessions.filter(s => (s.quality_score || 0) >= 7);
    const poorSleepDays = sleepSessions.filter(s => (s.quality_score || 0) < 5);
    
    if (goodSleepDays.length > 0 && poorSleepDays.length > 0) {
      patterns.push({
        domain: 'cognitive',
        title: 'Slaap-voeding verband',
        observation: `Er lijkt variatie te zijn tussen dagen met goede (${goodSleepDays.length}x) en minder goede slaap (${poorSleepDays.length}x).`,
        context: 'Het kan interessant zijn om te observeren of voeding, cafeïne of maaltijdtiming samenvallen met betere slaap.',
      });
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Patronen</h1>
          <p className="text-muted-foreground">
            Observaties in je eetpatroon, slaap en hoe je je voelt (14 dagen)
          </p>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : patterns.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12">
              <EmptyState
                icon={<Activity className="h-10 w-10" />}
                title="Nog geen patronen gevonden"
                description="Registreer meer data (maaltijden, slaap, symptomen) om patronen te ontdekken."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {patterns.map((pattern, index) => (
              <Card key={index} className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className={`p-1.5 rounded-full ${domainColors[pattern.domain] || 'bg-muted'}`}>
                      {domainIcons[pattern.domain] || <Activity className="h-4 w-4" />}
                    </span>
                    {pattern.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm font-medium">{pattern.observation}</p>
                  {pattern.context && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">{pattern.context}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Cycle phase context if available */}
            {currentSeason !== 'onbekend' && (
              <Card className="rounded-2xl border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Context: {seasonLabels[currentSeason]}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        De bovenstaande patronen kunnen samenhangen met je huidige cyclusfase. 
                        Veel vrouwen ervaren variatie in energie, slaap en klachten door de cyclus heen.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Deze observaties tonen mogelijke verbanden op basis van je eigen data. Ze vormen geen medisch advies.
        </p>
      </div>
    </AppLayout>
  );
}
