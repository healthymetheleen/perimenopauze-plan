import { useState } from 'react';
import { 
  FileText, Sparkles, Moon, Utensils, Activity, Heart, 
  Brain, AlertCircle, CheckCircle, Loader2, Info
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useGenerateMonthlyAnalysis, useCanGenerateMonthlyAnalysis, useSavedMonthlyAnalysis, useMonthlyAnalysisList, type MonthlyAnalysis } from '@/hooks/useMonthlyAnalysis';
import { useConsent } from '@/hooks/useConsent';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const domainIcons: Record<string, React.ReactNode> = {
  sleep: <Moon className="h-4 w-4" />,
  food: <Utensils className="h-4 w-4" />,
  cycle: <Heart className="h-4 w-4" />,
  mood: <Brain className="h-4 w-4" />,
  energy: <Activity className="h-4 w-4" />,
};

const domainLabels: Record<string, string> = {
  sleep: 'Slaap',
  food: 'Voeding',
  cycle: 'Cyclus',
  mood: 'Stemming',
  energy: 'Energie',
};

const domainColors: Record<string, string> = {
  sleep: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  food: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cycle: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  mood: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  energy: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function MonthlyAnalysisPage() {
  const { toast } = useToast();
  const { consent } = useConsent();
  const { data: savedAnalysis, isLoading: loadingSaved } = useSavedMonthlyAnalysis();
  const { data: analysisList } = useMonthlyAnalysisList();
  const { data: canGenerate, isLoading: checkingLimit } = useCanGenerateMonthlyAnalysis();
  const generateAnalysis = useGenerateMonthlyAnalysis();
  const [analysis, setAnalysis] = useState<MonthlyAnalysis | null>(null);

  // Use saved analysis if available, otherwise use generated one
  const displayAnalysis = analysis || savedAnalysis;

  const hasAIConsent = consent?.accepted_ai_processing === true;

  const handleGenerate = async () => {
    try {
      const result = await generateAnalysis.mutateAsync();
      setAnalysis(result);
      toast({
        title: 'Analyse gegenereerd!',
        description: 'Je maandelijkse analyse is klaar.',
      });
    } catch (error) {
      toast({
        title: 'Kon analyse niet genereren',
        description: error instanceof Error ? error.message : 'Probeer het later opnieuw.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Maandelijkse Analyse
          </h1>
          <p className="text-muted-foreground">
            Een uitgebreide analyse van al je data met orthomoleculaire inzichten
          </p>
        </div>

        {/* Info Card */}
        <Card className="glass rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="p-3 rounded-full bg-primary/20 h-fit">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Wat bevat deze analyse?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Patronen in slaap, voeding, stemming en energie</li>
                  <li>• Hormooncontext per cyclusfase (educatief)</li>
                  <li>• Orthomoleculaire voedingsinzichten</li>
                  <li>• Persoonlijke observaties en aandachtspunten</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Je kunt deze analyse 1x per maand genereren. Alle data wordt anoniem verwerkt.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consent Warning */}
        {!hasAIConsent && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>AI-toestemming vereist</AlertTitle>
            <AlertDescription>
              Om deze analyse te kunnen genereren is toestemming voor AI-verwerking nodig. 
              Ga naar Instellingen {'>'} Privacy om dit aan te passen.
            </AlertDescription>
          </Alert>
        )}

        {/* Generate Button - only show if no saved analysis */}
        {!displayAnalysis && (
          <Card className="glass rounded-2xl">
            <CardContent className="p-6 text-center space-y-4">
              {checkingLimit || loadingSaved ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              ) : canGenerate ? (
                <>
                  <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Klaar voor je maandanalyse?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We analyseren je data van de afgelopen 30 dagen
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleGenerate}
                    disabled={!hasAIConsent || generateAnalysis.isPending}
                    className="btn-gradient text-primary-foreground"
                  >
                    {generateAnalysis.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyseren...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Genereer Analyse
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-full bg-muted w-fit mx-auto">
                    <CheckCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Al gegenereerd deze maand</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Je kunt volgende maand een nieuwe analyse maken
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {displayAnalysis && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="glass-strong rounded-2xl card-premium">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Samenvatting
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {format(new Date(displayAnalysis.generatedAt), 'MMMM yyyy', { locale: nl })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{displayAnalysis.summary}</p>
                {displayAnalysis.positiveNote && (
                  <p className="text-primary font-medium mt-3">✨ {displayAnalysis.positiveNote}</p>
                )}
              </CardContent>
            </Card>

            {/* Patterns */}
            {displayAnalysis.patterns && displayAnalysis.patterns.length > 0 && (
              <Card className="glass rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Geobserveerde Patronen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {displayAnalysis.patterns.map((pattern, index) => (
                    <div key={index} className="p-4 rounded-xl bg-muted/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={domainColors[pattern.domain]}>
                          {domainIcons[pattern.domain]}
                          <span className="ml-1">{domainLabels[pattern.domain]}</span>
                        </Badge>
                      </div>
                      <p className="text-sm">{pattern.observation}</p>
                      {pattern.hormoneContext && (
                        <p className="text-xs text-muted-foreground italic">
                          💡 {pattern.hormoneContext}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Hormone Analysis */}
            {displayAnalysis.hormoneAnalysis && (
              <Card className="glass rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-rose-500" />
                    Hormoonpatronen
                  </CardTitle>
                  <CardDescription>Educatieve context over hormoonschommelingen</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{displayAnalysis.hormoneAnalysis}</p>
                </CardContent>
              </Card>
            )}

            {/* Nutrition Insights */}
            {displayAnalysis.nutritionInsights && (
              <Card className="glass rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-emerald-500" />
                    Voedingsinzichten
                  </CardTitle>
                  <CardDescription>Orthomoleculaire observaties</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{displayAnalysis.nutritionInsights}</p>
                </CardContent>
              </Card>
            )}

            {/* Sleep & Movement */}
            <div className="grid md:grid-cols-2 gap-4">
              {displayAnalysis.sleepAnalysis && (
                <Card className="glass rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Moon className="h-4 w-4 text-indigo-500" />
                      Slaapanalyse
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{displayAnalysis.sleepAnalysis}</p>
                  </CardContent>
                </Card>
              )}
              {displayAnalysis.movementAnalysis && (
                <Card className="glass rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-amber-500" />
                      Bewegingsanalyse
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{displayAnalysis.movementAnalysis}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recommendations */}
            {displayAnalysis.recommendations && displayAnalysis.recommendations.length > 0 && (
              <Card className="glass rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Aandachtspunten</CardTitle>
                  <CardDescription>Observaties om over na te denken</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {displayAnalysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Talk to Provider */}
            {displayAnalysis.talkToProvider && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Bespreek met je zorgverlener</AlertTitle>
                <AlertDescription>{displayAnalysis.talkToProvider}</AlertDescription>
              </Alert>
            )}

            {/* Disclaimer */}
            <Card className="glass rounded-2xl border-muted">
              <CardContent className="p-4">
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>{displayAnalysis.disclaimer}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
