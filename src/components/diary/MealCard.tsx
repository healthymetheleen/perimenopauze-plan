import { format } from 'date-fns';
import { Utensils } from 'lucide-react';
import type { Meal } from '@/hooks/useDiary';

interface MealCardProps {
  meal: Meal;
}

export function MealCard({ meal }: MealCardProps) {
  const hasNutrition = meal.kcal || meal.protein_g || meal.carbs_g || meal.fat_g;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="p-2 rounded-full bg-primary/10 shrink-0">
        <Utensils className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">
            {meal.time_local 
              ? format(new Date(`2000-01-01T${meal.time_local}`), 'HH:mm')
              : 'Tijd onbekend'}
          </p>
          {meal.kcal && (
            <span className="text-sm text-muted-foreground">{Math.round(meal.kcal)} kcal</span>
          )}
        </div>
        {hasNutrition && (
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
            {meal.protein_g && <span>{Math.round(meal.protein_g)}g eiwit</span>}
            {meal.carbs_g && <span>{Math.round(meal.carbs_g)}g koolh.</span>}
            {meal.fat_g && <span>{Math.round(meal.fat_g)}g vet</span>}
            {meal.fiber_g && <span>{Math.round(meal.fiber_g)}g vezels</span>}
          </div>
        )}
        {meal.ultra_processed_level !== null && meal.ultra_processed_level > 1 && (
          <span className="inline-block mt-2 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
            Bewerkt niveau {meal.ultra_processed_level}
          </span>
        )}
      </div>
    </div>
  );
}