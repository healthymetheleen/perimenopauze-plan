import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: string;
}

export function AddMealDialog({ open, onOpenChange, dayId }: AddMealDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [time, setTime] = useState(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');

  const addMeal = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('meals')
        .insert({
          owner_id: user.id,
          day_id: dayId,
          time_local: time,
          kcal: kcal ? parseFloat(kcal) : null,
          protein_g: protein ? parseFloat(protein) : null,
          carbs_g: carbs ? parseFloat(carbs) : null,
          fat_g: fat ? parseFloat(fat) : null,
          fiber_g: fiber ? parseFloat(fiber) : null,
          source: 'manual',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Maaltijd toegevoegd' });
      queryClient.invalidateQueries({ queryKey: ['meals', dayId] });
      queryClient.invalidateQueries({ queryKey: ['daily-scores'] });
      onOpenChange(false);
      setKcal('');
      setProtein('');
      setCarbs('');
      setFat('');
      setFiber('');
    },
    onError: () => {
      toast({ title: 'Kon maaltijd niet opslaan', variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Maaltijd toevoegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); addMeal.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="time">Tijd</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kcal">Calorieën</Label>
              <Input id="kcal" type="number" placeholder="kcal" value={kcal} onChange={(e) => setKcal(e.target.value)} min="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">Eiwit (g)</Label>
              <Input id="protein" type="number" placeholder="g" value={protein} onChange={(e) => setProtein(e.target.value)} min="0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carbs">Koolh. (g)</Label>
              <Input id="carbs" type="number" placeholder="g" value={carbs} onChange={(e) => setCarbs(e.target.value)} min="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Vet (g)</Label>
              <Input id="fat" type="number" placeholder="g" value={fat} onChange={(e) => setFat(e.target.value)} min="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiber">Vezels (g)</Label>
              <Input id="fiber" type="number" placeholder="g" value={fiber} onChange={(e) => setFiber(e.target.value)} min="0" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" className="flex-1" disabled={addMeal.isPending}>
              {addMeal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
