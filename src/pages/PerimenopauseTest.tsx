import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  RotateCcw,
  BookOpen,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth';
import { 
  QUESTIONS, 
  ANSWER_OPTIONS, 
  MAX_SCORES,
  RESULT_TEXTS,
  useSaveTestResult,
  usePerimenopauseTests,
  useDeleteTestResult,
  TestAnswers,
  TestResult,
  calculateDomainScore,
} from '@/hooks/usePerimenopauseTest';
import { toast } from 'sonner';

const DOMAIN_LABELS = {
  cycle: { label: 'Cyclus & Hormonen', icon: '🌙' },
  energy: { label: 'Energie & Slaap', icon: '⚡' },
  mental: { label: 'Mentaal & Emotioneel', icon: '🧠' },
  body: { label: 'Lichaam & Herstel', icon: '💪' },
};

type Step = 'intro' | 'questions' | 'result' | 'history';

export default function PerimenopauseTest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('intro');
  const [consentGiven, setConsentGiven] = useState(false);
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [answers, setAnswers] = useState<TestAnswers>({});
  const [savedResult, setSavedResult] = useState<TestResult | null>(null);

  const saveTest = useSaveTestResult();
  const { data: testHistory = [], isLoading: historyLoading } = usePerimenopauseTests();
  const deleteTest = useDeleteTestResult();

  const domains = Object.keys(QUESTIONS) as (keyof typeof QUESTIONS)[];
  const currentDomain = domains[currentDomainIndex];
  const allQuestions = domains.flatMap(d => QUESTIONS[d]);
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / allQuestions.length) * 100;

  const currentDomainQuestions = QUESTIONS[currentDomain];
  const currentDomainAnswered = currentDomainQuestions.every(q => answers[q.id] !== undefined);

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentDomainIndex < domains.length - 1) {
      setCurrentDomainIndex(prev => prev + 1);
    } else {
      // Submit
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentDomainIndex > 0) {
      setCurrentDomainIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const result = await saveTest.mutateAsync(answers);
      setSavedResult(result);
      setStep('result');
    } catch {
      toast.error('Er ging iets mis bij het opslaan');
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentDomainIndex(0);
    setConsentGiven(false);
    setSavedResult(null);
    setStep('intro');
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await deleteTest.mutateAsync(testId);
      toast.success('Testresultaat verwijderd');
    } catch {
      toast.error('Kon resultaat niet verwijderen');
    }
  };

  const renderScoreBar = (score: number, max: number, label: string, icon: string) => {
    const percentage = (score / max) * 100;
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium flex items-center gap-2">
            <span>{icon}</span> {label}
          </span>
          <span className="text-sm text-muted-foreground">{score}/{max}</span>
        </div>
        <Progress value={percentage} className="h-3" />
      </div>
    );
  };

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Login vereist</CardTitle>
            <CardDescription>
              Je moet ingelogd zijn om de perimenopauze-test te kunnen doen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')}>
              Inloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <AnimatePresence mode="wait">
        {/* INTRO STEP */}
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-3xl">🌸</span>
                </div>
                <CardTitle className="text-2xl">Perimenopauze Zelftest</CardTitle>
                <CardDescription className="text-base">
                  Ontdek of jouw klachten kunnen passen bij hormonale veranderingen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Deze test is bedoeld om je inzicht te geven in klachten die kunnen passen 
                    bij hormonale veranderingen rondom de perimenopauze. Het is <strong>geen 
                    medische diagnose</strong> en vervangt geen arts of zorgverlener.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold">Wat kun je verwachten?</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>17 vragen verdeeld over 4 thema's</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>Duurt ongeveer 5 minuten</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>Persoonlijke score met uitleg per domein</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>Je kunt je resultaten later terugkijken of verwijderen</span>
                    </li>
                  </ul>
                </div>

                <Separator />

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="consent"
                    checked={consentGiven}
                    onCheckedChange={(checked) => setConsentGiven(checked === true)}
                  />
                  <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                    Ik geef toestemming voor het verwerken van mijn antwoorden voor 
                    persoonlijke inzichten binnen de app.
                  </Label>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    size="lg" 
                    className="w-full"
                    disabled={!consentGiven}
                    onClick={() => setStep('questions')}
                  >
                    Start de test
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  
                  {testHistory.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setStep('history')}
                    >
                      <History className="mr-2 h-4 w-4" />
                      Bekijk eerdere resultaten ({testHistory.length})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* QUESTIONS STEP */}
        {step === 'questions' && (
          <motion.div
            key={`questions-${currentDomainIndex}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Domein {currentDomainIndex + 1} van {domains.length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {answeredCount}/{allQuestions.length} vragen
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="pt-4">
                  <CardTitle className="flex items-center gap-2">
                    <span>{DOMAIN_LABELS[currentDomain].icon}</span>
                    {DOMAIN_LABELS[currentDomain].label}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentDomainQuestions.map((question, idx) => (
                  <div key={question.id} className="space-y-3">
                    <p className="font-medium">
                      {idx + 1}. {question.text}
                    </p>
                    <RadioGroup
                      value={answers[question.id]?.toString()}
                      onValueChange={(value) => handleAnswer(question.id, parseInt(value))}
                      className="grid grid-cols-2 gap-2"
                    >
                      {ANSWER_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value={option.value.toString()} 
                            id={`${question.id}-${option.value}`}
                          />
                          <Label 
                            htmlFor={`${question.id}-${option.value}`}
                            className="cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentDomainIndex === 0}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Vorige
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!currentDomainAnswered || saveTest.isPending}
                  >
                    {currentDomainIndex === domains.length - 1 ? (
                      <>
                        {saveTest.isPending ? 'Opslaan...' : 'Bekijk resultaat'}
                        <CheckCircle2 className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Volgende
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* RESULT STEP */}
        {step === 'result' && savedResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-3xl">
                    {savedResult.result_category === 'low' && '🌱'}
                    {savedResult.result_category === 'moderate' && '🌻'}
                    {savedResult.result_category === 'high' && '🌸'}
                  </span>
                </div>
                <CardTitle className="text-2xl">Jouw Testresultaat</CardTitle>
                <CardDescription>
                  {format(new Date(savedResult.created_at), 'd MMMM yyyy', { locale: nl })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Total Score */}
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {savedResult.total_score} / {MAX_SCORES.total}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {RESULT_TEXTS[savedResult.result_category].title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {RESULT_TEXTS[savedResult.result_category].description}
                  </p>
                </div>

                {/* Domain Scores */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Score per domein</h4>
                  {renderScoreBar(
                    savedResult.domain_cycle_score, 
                    MAX_SCORES.cycle, 
                    DOMAIN_LABELS.cycle.label,
                    DOMAIN_LABELS.cycle.icon
                  )}
                  {renderScoreBar(
                    savedResult.domain_energy_score, 
                    MAX_SCORES.energy, 
                    DOMAIN_LABELS.energy.label,
                    DOMAIN_LABELS.energy.icon
                  )}
                  {renderScoreBar(
                    savedResult.domain_mental_score, 
                    MAX_SCORES.mental, 
                    DOMAIN_LABELS.mental.label,
                    DOMAIN_LABELS.mental.icon
                  )}
                  {renderScoreBar(
                    savedResult.domain_body_score, 
                    MAX_SCORES.body, 
                    DOMAIN_LABELS.body.label,
                    DOMAIN_LABELS.body.icon
                  )}
                </div>

                <Separator />

                {/* Disclaimer */}
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Deze test geeft geen medische diagnose. Bij aanhoudende of verergerende 
                    klachten is het verstandig dit te bespreken met een arts of zorgverlener.
                  </AlertDescription>
                </Alert>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <Button variant="outline" onClick={() => navigate('/educatie')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Lees meer over perimenopauze
                  </Button>
                  <Button variant="outline" onClick={handleRestart}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Doe de test opnieuw
                  </Button>
                  {testHistory.length > 1 && (
                    <Button variant="ghost" onClick={() => setStep('history')}>
                      <History className="mr-2 h-4 w-4" />
                      Bekijk eerdere resultaten
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* HISTORY STEP */}
        {step === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Eerdere Resultaten</CardTitle>
                    <CardDescription>
                      Bekijk je testgeschiedenis
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRestart}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Nieuwe test
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <p className="text-center text-muted-foreground py-8">Laden...</p>
                ) : testHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Je hebt nog geen tests gedaan.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {testHistory.map((test) => (
                      <div 
                        key={test.id}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {format(new Date(test.created_at), 'd MMMM yyyy', { locale: nl })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {RESULT_TEXTS[test.result_category].title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-primary">
                              {test.total_score}
                            </span>
                            <span className="text-muted-foreground">/ {MAX_SCORES.total}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          {Object.entries(DOMAIN_LABELS).map(([key, { label, icon }]) => {
                            const score = key === 'cycle' ? test.domain_cycle_score :
                                         key === 'energy' ? test.domain_energy_score :
                                         key === 'mental' ? test.domain_mental_score :
                                         test.domain_body_score;
                            const max = MAX_SCORES[key as keyof typeof MAX_SCORES];
                            return (
                              <div key={key} className="text-center p-2 bg-muted/50 rounded">
                                <span>{icon}</span>
                                <div className="font-medium">{score}/{max}</div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex justify-end">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Verwijderen
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Resultaat verwijderen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Dit testresultaat wordt permanent verwijderd. 
                                  Dit kan niet ongedaan worden gemaakt.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTest(test.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Verwijderen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
