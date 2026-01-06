import { useState, useEffect, useRef } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Plus, Utensils } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ScoreBadge } from '@/components/ui/score-badge';
import { useDiaryDay, useMeals, useDailyScores } from '@/hooks/useDiary';
import { AddMealDialog } from '@/components/diary/AddMealDialog';
import { MealCard } from '@/components/diary/MealCard';
import { WeeklyInsightCard } from '@/components/diary/WeeklyInsightCard';
import { useToast } from '@/hooks/use-toast';

export default function DiaryPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAddMeal, setShowAddMeal] = useState(false);
  const openMealHandledRef = useRef(false);
  
  const dateLocale = i18n.language === 'nl' ? nl : enUS;
  const { data: diaryDay, isLoading: dayLoading, createDay } = useDiaryDay(selectedDate);
  const { data: meals, isLoading: mealsLoading } = useMeals(diaryDay?.id || null);
  const { data: scores } = useDailyScores(7);

  // Translate score reason codes
  const translateScoreReason = (reason: string): { text: string; advice: string } => {
    const reasonKey = reason as keyof typeof reasonMap;
    const reasonMap = {
      'low_protein': { text: t('diary.score_reasons.low_protein'), advice: t('diary.score_reasons.low_protein_advice') },
      'low_fiber': { text: t('diary.score_reasons.low_fiber'), advice: t('diary.score_reasons.low_fiber_advice') },
      'high_ultra_processed': { text: t('diary.score_reasons.high_ultra_processed'), advice: t('diary.score_reasons.high_ultra_processed_advice') },
      'few_meals': { text: t('diary.score_reasons.few_meals'), advice: t('diary.score_reasons.few_meals_advice') },
      'no_breakfast': { text: t('diary.score_reasons.no_breakfast'), advice: t('diary.score_reasons.no_breakfast_advice') },
      'late_eating': { text: t('diary.score_reasons.late_eating'), advice: t('diary.score_reasons.late_eating_advice') },
      'skipped_meal': { text: t('diary.score_reasons.skipped_meal'), advice: t('diary.score_reasons.skipped_meal_advice') },
      'good_protein': { text: t('diary.score_reasons.good_protein'), advice: t('diary.score_reasons.good_protein_advice') },
      'good_fiber': { text: t('diary.score_reasons.good_fiber'), advice: t('diary.score_reasons.good_fiber_advice') },
      'balanced_meals': { text: t('diary.score_reasons.balanced_meals'), advice: t('diary.score_reasons.balanced_meals_advice') },
    };
    return reasonMap[reasonKey] || { text: reason, advice: '' };
  };

  // Open meal dialog if query param is set (e.g. Dashboard quick action)
  useEffect(() => {
    if (searchParams.get('openMeal') !== 'true') return;
    if (dayLoading) return; // wait until we know whether today's diaryDay exists
    if (openMealHandledRef.current) return;
    openMealHandledRef.current = true;

    const openMealFromDashboard = async () => {
      // Clear param immediately to prevent duplicate inserts/re-renders from re-triggering
      setSearchParams({}, { replace: true });

      try {
        if (!diaryDay) {
          await createDay.mutateAsync();
        }
        setShowAddMeal(true);
      } catch (err) {
        console.error('[Diary] openMeal failed', err);
        toast({
          title: t('diary.could_not_open'),
          description: t('diary.try_again'),
          variant: 'destructive',
        });
      }
    };

    void openMealFromDashboard();
  }, [searchParams, setSearchParams, dayLoading, diaryDay, createDay, toast, t]);
  
  const todayScore = scores?.find(s => s.day_date === selectedDate);
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  const handlePrevDay = () => {
    setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    if (!isToday) {
      setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
    }
  };

  const handleAddMeal = async () => {
    // Ensure day exists before opening dialog
    if (!diaryDay) {
      await createDay.mutateAsync();
    }
    setShowAddMeal(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-full overflow-x-hidden">
        {/* Date navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handlePrevDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">
              {isToday ? t('common.today') : format(new Date(selectedDate), "EEEE d MMMM", { locale: dateLocale })}
            </h1>
            {!isToday && (
              <p className="text-sm text-muted-foreground">
                {format(new Date(selectedDate), "d MMMM yyyy", { locale: dateLocale })}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextDay} disabled={isToday}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Day score */}
        {todayScore && (
          <Card className="rounded-2xl">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <ScoreBadge score={todayScore.day_score} size="lg" />
                  <div>
                    <p className="font-medium">{t('diary.day_score')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('diary.meals_count', { count: todayScore.meals_count || 0 })}
                    </p>
                  </div>
                </div>
                
                {/* Nutrition totals */}
                <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-muted/50">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(todayScore.kcal_total || 0)}</p>
                    <p className="text-xs text-muted-foreground">{t('diary.kcal')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(todayScore.protein_g || 0)}g</p>
                    <p className="text-xs text-muted-foreground">{t('diary.protein')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(todayScore.carbs_g || 0)}g</p>
                    <p className="text-xs text-muted-foreground">{t('diary.carbs')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(todayScore.fiber_g || 0)}g</p>
                    <p className="text-xs text-muted-foreground">{t('diary.fiber')}</p>
                  </div>
                </div>
                {todayScore.score_reasons && todayScore.score_reasons.length > 0 && (
                  <div className="space-y-3 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('diary.analysis_tips')}</p>
                    <div className="space-y-3">
                      {todayScore.score_reasons.map((reason, i) => {
                        const translated = translateScoreReason(reason);
                        return (
                          <div key={i} className="p-3 rounded-lg bg-muted/50">
                            <p className="font-medium text-sm flex items-center gap-2">
                              <span className={reason.startsWith('good') || reason === 'balanced_meals' ? 'text-green-500' : 'text-amber-500'}>•</span>
                              {translated.text}
                            </p>
                            {translated.advice && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {translated.advice}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meals section */}
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              {t('diary.meals')}
            </CardTitle>
            <Button size="sm" onClick={handleAddMeal}>
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </Button>
          </CardHeader>
          <CardContent>
            {dayLoading || mealsLoading ? (
              <LoadingState size="sm" />
            ) : meals && meals.length > 0 ? (
              <div className="space-y-3">
                {meals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Utensils className="h-8 w-8" />}
                title={t('diary.no_meals')}
                description={isToday ? t('diary.add_first') : t('diary.no_meals_logged')}
                action={isToday ? {
                  label: t('diary.add_meal'),
                  onClick: handleAddMeal,
                } : undefined}
              />
            )}
          </CardContent>
        </Card>

        {/* Weekly AI Insight - only on today, at bottom */}
        {isToday && <WeeklyInsightCard />}
      </div>

      {diaryDay && (
        <AddMealDialog 
          open={showAddMeal} 
          onOpenChange={setShowAddMeal}
          dayId={diaryDay.id}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      )}
    </AppLayout>
  );
}