import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/lib/supabase-app';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: string;
}

interface DailyContext {
  id?: string;
  sleep_duration_h: number | null;
  sleep_quality_0_10: number | null;
  stress_0_10: number | null;
  steps: number | null;
  cycle_day: number | null;
  cycle_phase: string | null;
}

const cyclePhases = [
  { value: 'menstrual', label: 'Menstruatie' },
  { value: 'follicular', label: 'Folliculair' },
  { value: 'ovulatory', label: 'Ovulatie' },
  { value: 'luteal', label: 'Luteaal' },
  { value: 'unknown', label: 'Onbekend' },
];

export function ContextDialog({ open, onOpenChange, dayId }: ContextDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<number[]>([5]);
  const [stress, setStress] = useState<number[]>([5]);
  const [steps, setSteps] = useState('');
  const [cycleDay, setCycleDay] = useState('');
  const [cyclePhase, setCyclePhase] = useState<string>('unknown');

  // Fetch existing context
  const { data: existingContext } = useQuery({
    queryKey: ['daily-context', dayId],
    queryFn: async () => {
      if (!user || !dayId) return null;
      const { data, error } = await appClient
        .from('daily_context')
        .select('*')
        .eq('day_id', dayId)
        .eq('owner_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as DailyContext | null;
    },
    enabled: !!user && !!dayId && open,
  });

  // Populate form when existing data loads
  useEffect(() => {
    if (existingContext) {
      setSleepHours(existingContext.sleep_duration_h?.toString() || '');
      setSleepQuality([existingContext.sleep_quality_0_10 ?? 5]);
      setStress([existingContext.stress_0_10 ?? 5]);
      setSteps(existingContext.steps?.toString() || '');
      setCycleDay(existingContext.cycle_day?.toString() || '');
      setCyclePhase(existingContext.cycle_phase || 'unknown');
    }
  }, [existingContext]);

  const saveContext = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const contextData = {
        owner_id: user.id,
        day_id: dayId,
        sleep_duration_h: sleepHours ? parseFloat(sleepHours) : null,
        sleep_quality_0_10: sleepQuality[0],
        stress_0_10: stress[0],
        steps: steps ? parseInt(steps) : null,
        cycle_day: cycleDay ? parseInt(cycleDay) : null,
        cycle_phase: cyclePhase,
      };

      if (existingContext?.id) {
        const { error } = await appClient
          .from('daily_context')
          .update(contextData)
          .eq('id', existingContext.id);
        if (error) throw error;
      } else {
        const { error } = await appClient
          .from('daily_context')
          .insert(contextData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Context opgeslagen' });
      queryClient.invalidateQueries({ queryKey: ['daily-context', dayId] });
      queryClient.invalidateQueries({ queryKey: ['daily-scores'] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Kon context niet opslaan', variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Slaap & Stress</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); saveContext.mutate(); }} className="space-y-6">
          {/* Sleep duration */}
          <div className="space-y-2">
            <Label htmlFor="sleep">Slaap (uren)</Label>
            <Input
              id="sleep"
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder="7.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
            />
          </div>

          {/* Sleep quality */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Slaapkwaliteit</Label>
              <span className="text-sm text-muted-foreground">{sleepQuality[0]}/10</span>
            </div>
            <Slider
              value={sleepQuality}
              onValueChange={setSleepQuality}
              min={0}
              max={10}
              step={1}
              className="py-2"
            />
          </div>

          {/* Stress level */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Stressniveau</Label>
              <span className="text-sm text-muted-foreground">{stress[0]}/10</span>
            </div>
            <Slider
              value={stress}
              onValueChange={setStress}
              min={0}
              max={10}
              step={1}
              className="py-2"
            />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <Label htmlFor="steps">Stappen</Label>
            <Input
              id="steps"
              type="number"
              min="0"
              placeholder="8000"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
          </div>

          {/* Cycle info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cycleDay">Cyclusdag</Label>
              <Input
                id="cycleDay"
                type="number"
                min="1"
                max="60"
                placeholder="14"
                value={cycleDay}
                onChange={(e) => setCycleDay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cyclusfase</Label>
              <Select value={cyclePhase} onValueChange={setCyclePhase}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cyclePhases.map((phase) => (
                    <SelectItem key={phase.value} value={phase.value}>
                      {phase.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" className="flex-1" disabled={saveContext.isPending}>
              {saveContext.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
