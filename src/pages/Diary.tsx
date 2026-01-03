import { useState } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Utensils, Moon, Activity } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ScoreBadge } from '@/components/ui/score-badge';
import { useDiaryDay, useMeals, useDailyScores } from '@/hooks/useDiary';
import { AddMealDialog } from '@/components/diary/AddMealDialog';
import { ContextDialog } from '@/components/diary/ContextDialog';
import { SymptomsDialog } from '@/components/diary/SymptomsDialog';
import { MealCard } from '@/components/diary/MealCard';

// Translate score reason codes to Dutch explanations
const translateScoreReason = (reason: string): string => {
  const translations: Record<string, string> = {
    'low_protein': 'Weinig eiwit vandaag - probeer 20-30g per maaltijd',
    'low_fiber': 'Weinig vezels - voeg groenten of peulvruchten toe',
    'high_ultra_processed': 'Veel ultrabewerkte producten - kies voor onbewerkt',
    'few_meals': 'Weinig maaltijden gelogd',
    'no_breakfast': 'Geen ontbijt geregistreerd',
    'late_eating': 'Laat gegeten - probeer 2-3 uur voor slapen te stoppen',
    'skipped_meal': 'Maaltijd overgeslagen',
    'good_protein': 'Goede eiwitinname 💪',
    'good_fiber': 'Voldoende vezels 🥬',
    'balanced_meals': 'Gebalanceerde maaltijden ✓',
  };
  return translations[reason] || reason;
};

export default function DiaryPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showSymptoms, setShowSymptoms] = useState(false);
  
  const { data: diaryDay, isLoading: dayLoading, createDay } = useDiaryDay(selectedDate);
  const { data: meals, isLoading: mealsLoading } = useMeals(diaryDay?.id || null);
  const { data: scores } = useDailyScores(7);
  
  const todayScore = scores?.find(s => s.day_date === selectedDate);
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const isPast = new Date(selectedDate) < new Date(format(new Date(), 'yyyy-MM-dd'));

  const handlePrevDay = () => {
    setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    if (!isToday) {
      setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
    }
  };

  const handleAddMeal = async () => {
    if (!diaryDay) {
      await createDay.mutateAsync();
    }
    setShowAddMeal(true);
  };

  const handleOpenContext = async () => {
    if (!diaryDay) {
      await createDay.mutateAsync();
    }
    setShowContext(true);
  };

  const handleOpenSymptoms = async () => {
    if (!diaryDay) {
      await createDay.mutateAsync();
    }
    setShowSymptoms(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Date navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handlePrevDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">
              {isToday ? 'Vandaag' : format(new Date(selectedDate), "EEEE d MMMM", { locale: nl })}
            </h1>
            {!isToday && (
              <p className="text-sm text-muted-foreground">
                {format(new Date(selectedDate), "d MMMM yyyy", { locale: nl })}
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
                    <p className="font-medium">Dagscore</p>
                    <p className="text-sm text-muted-foreground">
                      {todayScore.meals_count || 0} maaltijden • {Math.round(todayScore.protein_g || 0)}g eiwit • {Math.round(todayScore.fiber_g || 0)}g vezels
                    </p>
                  </div>
                </div>
                {todayScore.score_reasons && todayScore.score_reasons.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground">Signalen:</p>
                    <ul className="space-y-1">
                      {todayScore.score_reasons.map((reason, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          <span>{translateScoreReason(reason)}</span>
                        </li>
                      ))}
                    </ul>
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
              Maaltijden
            </CardTitle>
            <Button size="sm" onClick={handleAddMeal}>
              <Plus className="h-4 w-4 mr-1" />
              Toevoegen
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
                title="Nog geen maaltijden"
                description={isToday ? "Voeg je eerste maaltijd toe" : "Geen maaltijden geregistreerd"}
                action={isToday ? {
                  label: 'Maaltijd toevoegen',
                  onClick: handleAddMeal,
                } : undefined}
              />
            )}
          </CardContent>
        </Card>

        {/* Quick actions for context and symptoms */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="rounded-2xl hover:shadow-md transition-shadow cursor-pointer"
            onClick={handleOpenContext}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Moon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Slaap & Stress</p>
                  <p className="text-xs text-muted-foreground">Bijwerken</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="rounded-2xl hover:shadow-md transition-shadow cursor-pointer"
            onClick={handleOpenSymptoms}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-secondary/10">
                  <Activity className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Symptomen</p>
                  <p className="text-xs text-muted-foreground">Registreren</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {diaryDay && (
        <>
          <AddMealDialog 
            open={showAddMeal} 
            onOpenChange={setShowAddMeal}
            dayId={diaryDay.id}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
          <ContextDialog
            open={showContext}
            onOpenChange={setShowContext}
            dayId={diaryDay.id}
          />
          <SymptomsDialog
            open={showSymptoms}
            onOpenChange={setShowSymptoms}
            dayId={diaryDay.id}
          />
        </>
      )}
    </AppLayout>
  );
}