import { useState } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';
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

// Translate score reason codes to Dutch explanations with detailed advice
const translateScoreReason = (reason: string): { text: string; advice: string } => {
  const translations: Record<string, { text: string; advice: string }> = {
    'low_protein': {
      text: 'Weinig eiwit vandaag',
      advice: 'Eiwit is essentieel voor hormoonbalans, spieronderhoud en verzadiging. Streef naar 20-30g per maaltijd. Goede bronnen: eieren, vis, peulvruchten, noten, zuivel, vlees.'
    },
    'low_fiber': {
      text: 'Weinig vezels',
      advice: 'Vezels ondersteunen je darmen, hormoonafvoer en bloedsuikerregulatie. Voeg extra groenten, peulvruchten, havermout of chiazaad toe. Streef naar 25-30g per dag.'
    },
    'high_ultra_processed': {
      text: 'Veel ultrabewerkte producten',
      advice: 'Ultrabewerkte voeding kan ontstekingen verhogen en je bloedsuiker destabiliseren. Kies waar mogelijk voor onbewerkte alternatieven met herkenbare ingrediënten.'
    },
    'few_meals': {
      text: 'Weinig maaltijden gelogd',
      advice: 'Regelmatig eten (3-4x per dag) houdt je bloedsuiker stabiel en voorkomt energiedips. Overslaan van maaltijden kan cortisol verhogen.'
    },
    'no_breakfast': {
      text: 'Geen ontbijt geregistreerd',
      advice: 'Een eiwitrijk ontbijt binnen 1-2 uur na opstaan helpt je stresshormonen te reguleren en geeft een stabiele start van de dag.'
    },
    'late_eating': {
      text: 'Laat gegeten',
      advice: 'Eten dicht voor het slapen kan je slaapkwaliteit beïnvloeden. Probeer je laatste maaltijd 2-3 uur voor bedtijd af te ronden.'
    },
    'skipped_meal': {
      text: 'Maaltijd overgeslagen',
      advice: 'Het overslaan van maaltijden kan je stresssysteem activeren, vooral in de luteale fase. Probeer regelmatig te eten, ook al heb je weinig trek.'
    },
    'good_protein': {
      text: 'Goede eiwitinname 💪',
      advice: 'Mooi! Voldoende eiwit ondersteunt je spieren, hormonen en verzadiging. Blijf dit volhouden.'
    },
    'good_fiber': {
      text: 'Voldoende vezels 🥬',
      advice: 'Top! Je vezelinname ziet er goed uit. Dit helpt je darmen en hormoonbalans.'
    },
    'balanced_meals': {
      text: 'Gebalanceerde maaltijden ✓',
      advice: 'Uitstekend! Je maaltijden zijn goed samengesteld met een goede balans van macronutriënten.'
    },
  };
  return translations[reason] || { text: reason, advice: '' };
};

export default function DiaryPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAddMeal, setShowAddMeal] = useState(false);
  
  const { data: diaryDay, isLoading: dayLoading, createDay } = useDiaryDay(selectedDate);
  const { data: meals, isLoading: mealsLoading } = useMeals(diaryDay?.id || null);
  const { data: scores } = useDailyScores(7);
  
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
                      {todayScore.meals_count || 0} maaltijden
                    </p>
                  </div>
                </div>
                
                {/* Nutrition totals */}
                <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-muted/50">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(todayScore.kcal_total || 0)}</p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(todayScore.protein_g || 0)}g</p>
                    <p className="text-xs text-muted-foreground">eiwit</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(todayScore.carbs_g || 0)}g</p>
                    <p className="text-xs text-muted-foreground">koolh</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(todayScore.fiber_g || 0)}g</p>
                    <p className="text-xs text-muted-foreground">vezels</p>
                  </div>
                </div>
                {todayScore.score_reasons && todayScore.score_reasons.length > 0 && (
                  <div className="space-y-3 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Analyse & Tips</p>
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