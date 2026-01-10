import { useState } from 'react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Meal } from '@/hooks/useDiary';

// Generate a description from meal data
function getMealSummary(meal: Meal): string {
  // Use AI description if available
  const flags = meal.quality_flags;
  if (flags?.ai_description) {
    // Truncate long descriptions
    const desc = flags.ai_description;
    return desc.length > 50 ? desc.substring(0, 50) + '...' : desc;
  }
  
  // Fall back to items names
  if (flags?.items && flags.items.length > 0) {
    const names = flags.items.map(i => i.name).join(', ');
    return names.length > 50 ? names.substring(0, 50) + '...' : names;
  }
  
  // Fall back to macros
  const parts: string[] = [];
  if (meal.kcal) parts.push(`${Math.round(meal.kcal)} kcal`);
  if (meal.protein_g) parts.push(`${Math.round(meal.protein_g)}g eiwit`);
  return parts.length > 0 ? parts.join(', ') : 'Maaltijd';
}

interface MealCardProps {
  meal: Meal;
}

export function MealCard({ meal }: MealCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [editValues, setEditValues] = useState({
    time_local: meal.time_local || '',
    kcal: meal.kcal?.toString() || '',
    protein_g: meal.protein_g?.toString() || '',
    carbs_g: meal.carbs_g?.toString() || '',
    fat_g: meal.fat_g?.toString() || '',
    fiber_g: meal.fiber_g?.toString() || '',
  });

  const hasNutrition = meal.kcal || meal.protein_g || meal.carbs_g || meal.fat_g;

  const updateMeal = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Niet ingelogd');
      const { error } = await supabase
        .from('meals')
        .update({
          time_local: editValues.time_local || null,
          kcal: editValues.kcal ? parseFloat(editValues.kcal) : null,
          protein_g: editValues.protein_g ? parseFloat(editValues.protein_g) : null,
          carbs_g: editValues.carbs_g ? parseFloat(editValues.carbs_g) : null,
          fat_g: editValues.fat_g ? parseFloat(editValues.fat_g) : null,
          fiber_g: editValues.fiber_g ? parseFloat(editValues.fiber_g) : null,
        } as never)
        .eq('id' as never, meal.id)
        .eq('owner_id' as never, user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Maaltijd bijgewerkt' });
      queryClient.invalidateQueries({ queryKey: ['meals', meal.day_id] });
      queryClient.invalidateQueries({ queryKey: ['daily-scores'] });
      setShowEdit(false);
    },
    onError: () => {
      toast({ title: 'Kon maaltijd niet bijwerken', variant: 'destructive' });
    },
  });

  const deleteMeal = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Niet ingelogd');
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id' as never, meal.id)
        .eq('owner_id' as never, user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Maaltijd verwijderd' });
      queryClient.invalidateQueries({ queryKey: ['meals', meal.day_id] });
      queryClient.invalidateQueries({ queryKey: ['daily-scores'] });
    },
    onError: () => {
      toast({ title: 'Kon maaltijd niet verwijderen', variant: 'destructive' });
    },
  });

  // Get meal description for display
  const mealDescription = getMealSummary(meal);

  return (
    <>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
        <div className="p-2 rounded-full bg-primary/10 shrink-0">
          <Utensils className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">
                  {meal.time_local 
                    ? format(new Date(`2000-01-01T${meal.time_local}`), 'HH:mm')
                    : 'Tijd onbekend'}
                </p>
                {meal.kcal && (
                  <span className="text-xs text-muted-foreground">{Math.round(meal.kcal)} kcal</span>
                )}
              </div>
              {/* Show meal description/summary */}
              <p className="text-sm text-foreground mt-0.5 truncate">
                {mealDescription}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowEdit(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => deleteMeal.mutate()}
                disabled={deleteMeal.isPending}
              >
                {deleteMeal.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          {hasNutrition && (
            <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
              {meal.protein_g && <span className="bg-muted px-1.5 py-0.5 rounded">{Math.round(meal.protein_g)}g eiwit</span>}
              {meal.fiber_g && <span className="bg-muted px-1.5 py-0.5 rounded">{Math.round(meal.fiber_g)}g vezels</span>}
            </div>
          )}
          {meal.ultra_processed_level !== null && meal.ultra_processed_level > 1 && (
            <span className="inline-block mt-2 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
              Bewerkt niveau {meal.ultra_processed_level}
            </span>
          )}
        </div>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {meal.time_local 
                ? `${format(new Date(`2000-01-01T${meal.time_local}`), 'HH:mm')} - ${getMealSummary(meal)}`
                : getMealSummary(meal)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-time">Tijd</Label>
              <Input
                id="edit-time"
                type="time"
                value={editValues.time_local}
                onChange={(e) => setEditValues({ ...editValues, time_local: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-kcal">Calorieën</Label>
                <Input
                  id="edit-kcal"
                  type="number"
                  value={editValues.kcal}
                  onChange={(e) => setEditValues({ ...editValues, kcal: e.target.value })}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-protein">Eiwit (g)</Label>
                <Input
                  id="edit-protein"
                  type="number"
                  value={editValues.protein_g}
                  onChange={(e) => setEditValues({ ...editValues, protein_g: e.target.value })}
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-carbs">Koolh. (g)</Label>
                <Input
                  id="edit-carbs"
                  type="number"
                  value={editValues.carbs_g}
                  onChange={(e) => setEditValues({ ...editValues, carbs_g: e.target.value })}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fat">Vet (g)</Label>
                <Input
                  id="edit-fat"
                  type="number"
                  value={editValues.fat_g}
                  onChange={(e) => setEditValues({ ...editValues, fat_g: e.target.value })}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fiber">Vezels (g)</Label>
                <Input
                  id="edit-fiber"
                  type="number"
                  value={editValues.fiber_g}
                  onChange={(e) => setEditValues({ ...editValues, fiber_g: e.target.value })}
                  min="0"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowEdit(false)}>
                Annuleren
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => updateMeal.mutate()}
                disabled={updateMeal.isPending}
              >
                {updateMeal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}