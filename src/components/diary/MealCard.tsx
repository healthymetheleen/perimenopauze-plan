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
        })
        .eq('id', meal.id)
        .eq('owner_id', user.id);
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
        .eq('id', meal.id)
        .eq('owner_id', user.id);
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

  return (
    <>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
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
            <div className="flex items-center gap-1">
              {meal.kcal && (
                <span className="text-sm text-muted-foreground mr-2">{Math.round(meal.kcal)} kcal</span>
              )}
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

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Maaltijd bewerken</DialogTitle>
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