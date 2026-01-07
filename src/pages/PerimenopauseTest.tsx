import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  RotateCcw,
  BookOpen,
  History,
  Moon,
  Zap,
  Brain,
  Heart,
  Flower2,
  Leaf,
  Sun,
  Home,
  type LucideIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
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
  MAX_SCORES,
  useSaveTestResult,
  usePerimenopauseTests,
  useDeleteTestResult,
  TestAnswers,
  TestResult,
} from '@/hooks/usePerimenopauseTest';
import { toast } from 'sonner';

const DOMAIN_ICONS: Record<string, LucideIcon> = {
  cycle: Moon,
  energy: Zap,
  mental: Brain,
  body: Heart,
};

const RESULT_ICONS: Record<string, LucideIcon> = {
  low: Leaf,
  moderate: Sun,
  high: Flower2,
};

type Step = 'intro' | 'questions' | 'result' | 'history';

export default function PerimenopauseTest() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('intro');
  const [consentGiven, setConsentGiven] = useState(false);
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [answers, setAnswers] = useState<TestAnswers>({});
  const [savedResult, setSavedResult] = useState<TestResult | null>(null);

  const dateLocale = i18n.language === 'nl' ? nl : enUS;

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

  const answerOptions = [
    { value: 0, label: t('perimenopause_test.answer_never') },
    { value: 1, label: t('perimenopause_test.answer_sometimes') },
    { value: 2, label: t('perimenopause_test.answer_often') },
    { value: 3, label: t('perimenopause_test.answer_always') },
  ];

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentDomainIndex < domains.length - 1) {
      setCurrentDomainIndex(prev => prev + 1);
    } else {
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
      toast.error(t('perimenopause_test.save_error'));
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
      toast.success(t('perimenopause_test.result_deleted'));
    } catch {
      toast.error(t('perimenopause_test.could_not_delete'));
    }
  };

  const getDomainLabel = (domain: string) => t(`perimenopause_test.domains.${domain}`);
  const getQuestionText = (questionId: string) => t(`perimenopause_test.questions_list.${questionId}`);
  const getResultTitle = (category: string) => t(`perimenopause_test.results.${category}.title`);
  const getResultDescription = (category: string) => t(`perimenopause_test.results.${category}.description`);

  const renderScoreBar = (score: number, max: number, domain: string) => {
    const percentage = (score / max) * 100;
    const Icon = DOMAIN_ICONS[domain];
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {getDomainLabel(domain)}
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
            <CardTitle>{t('perimenopause_test.login_required')}</CardTitle>
            <CardDescription>
              {t('perimenopause_test.login_required_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')}>
              {t('common.login')}
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
                  <Flower2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{t('perimenopause_test.title')}</CardTitle>
                <CardDescription className="text-base">
                  {t('perimenopause_test.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription dangerouslySetInnerHTML={{ __html: t('perimenopause_test.disclaimer') }} />
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold">{t('perimenopause_test.what_to_expect')}</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{t('perimenopause_test.expect_1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{t('perimenopause_test.expect_2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{t('perimenopause_test.expect_3')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{t('perimenopause_test.expect_4')}</span>
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
                    {t('perimenopause_test.consent_label')}
                  </Label>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    size="lg" 
                    className="w-full"
                    disabled={!consentGiven}
                    onClick={() => setStep('questions')}
                  >
                    {t('perimenopause_test.start_test')}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  
                  {testHistory.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setStep('history')}
                    >
                      <History className="mr-2 h-4 w-4" />
                      {t('perimenopause_test.view_history')} ({testHistory.length})
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
                    {t('perimenopause_test.domain')} {currentDomainIndex + 1} {t('perimenopause_test.domain_of', { current: currentDomainIndex + 1, total: domains.length }).replace(`${currentDomainIndex + 1} `, '')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {answeredCount}/{allQuestions.length} {t('perimenopause_test.questions')}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="pt-4">
                  {(() => {
                    const DomainIcon = DOMAIN_ICONS[currentDomain];
                    return (
                      <CardTitle className="flex items-center gap-2">
                        <DomainIcon className="h-5 w-5 text-primary" />
                        {getDomainLabel(currentDomain)}
                      </CardTitle>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentDomainQuestions.map((question, idx) => (
                  <div key={question.id} className="space-y-3">
                    <p className="font-medium">
                      {idx + 1}. {getQuestionText(question.id)}
                    </p>
                    <RadioGroup
                      value={answers[question.id]?.toString()}
                      onValueChange={(value) => handleAnswer(question.id, parseInt(value))}
                      className="grid grid-cols-2 gap-2"
                    >
                      {answerOptions.map((option) => (
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
                    {t('perimenopause_test.previous')}
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!currentDomainAnswered || saveTest.isPending}
                  >
                    {currentDomainIndex === domains.length - 1 ? (
                      <>
                        {saveTest.isPending ? t('perimenopause_test.saving') : t('perimenopause_test.view_result')}
                        <CheckCircle2 className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        {t('perimenopause_test.next')}
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
                {(() => {
                  const ResultIcon = RESULT_ICONS[savedResult.result_category];
                  return (
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <ResultIcon className="h-8 w-8 text-primary" />
                    </div>
                  );
                })()}
                <CardTitle className="text-2xl">{t('perimenopause_test.your_result')}</CardTitle>
                <CardDescription>
                  {format(new Date(savedResult.created_at), 'd MMMM yyyy', { locale: dateLocale })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Total Score */}
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {savedResult.total_score} / {MAX_SCORES.total}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {getResultTitle(savedResult.result_category)}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {getResultDescription(savedResult.result_category)}
                  </p>
                </div>

                {/* Domain Scores */}
                <div className="space-y-4">
                  <h4 className="font-semibold">{t('perimenopause_test.score_per_domain')}</h4>
                  {renderScoreBar(savedResult.domain_cycle_score, MAX_SCORES.cycle, 'cycle')}
                  {renderScoreBar(savedResult.domain_energy_score, MAX_SCORES.energy, 'energy')}
                  {renderScoreBar(savedResult.domain_mental_score, MAX_SCORES.mental, 'mental')}
                  {renderScoreBar(savedResult.domain_body_score, MAX_SCORES.body, 'body')}
                </div>

                <Separator />

                {/* Disclaimer */}
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {t('perimenopause_test.result_disclaimer')}
                  </AlertDescription>
                </Alert>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <Button variant="outline" onClick={() => navigate('/educatie')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    {t('perimenopause_test.read_more')}
                  </Button>
                  <Button variant="outline" onClick={handleRestart}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t('perimenopause_test.take_again')}
                  </Button>
                  {testHistory.length > 1 && (
                    <Button variant="ghost" onClick={() => setStep('history')}>
                      <History className="mr-2 h-4 w-4" />
                      {t('perimenopause_test.view_history')}
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                    <Home className="mr-2 h-4 w-4" />
                    {t('perimenopause_test.back_to_home')}
                  </Button>
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
                    <CardTitle>{t('perimenopause_test.test_history')}</CardTitle>
                    <CardDescription>
                      {t('perimenopause_test.view_history')}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRestart}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t('perimenopause_test.start_test')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
                ) : testHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t('common.no_data')}
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
                              {format(new Date(test.created_at), 'd MMMM yyyy', { locale: dateLocale })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getResultTitle(test.result_category)}
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
                          {Object.entries(DOMAIN_ICONS).map(([key, Icon]) => {
                            const score = key === 'cycle' ? test.domain_cycle_score :
                                         key === 'energy' ? test.domain_energy_score :
                                         key === 'mental' ? test.domain_mental_score :
                                         test.domain_body_score;
                            const max = MAX_SCORES[key as keyof typeof MAX_SCORES];
                            return (
                              <div key={key} className="text-center p-2 bg-muted/50 rounded">
                                <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
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
                                {t('common.delete')}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('perimenopause_test.delete_confirm_title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('perimenopause_test.delete_confirm_desc')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTest(test.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t('common.delete')}
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
