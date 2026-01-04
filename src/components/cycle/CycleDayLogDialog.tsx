import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  useLogBleeding,
  useLogCycleSymptoms,
  useStartCycle,
  useDeleteBleeding,
  BleedingLog,
  CycleSymptomLog,
} from '@/hooks/useCycle';
import { Loader2, Droplets, Heart, Trash2 } from 'lucide-react';

interface CycleDayLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
}

const intensityOptions = [
  { value: 'geen', label: 'Geen', color: 'bg-gray-100' },
  { value: 'spotting', label: 'Spotting', color: 'bg-pink-200' },
  { value: 'licht', label: 'Licht', color: 'bg-pink-300' },
  { value: 'normaal', label: 'Normaal', color: 'bg-red-300' },
  { value: 'hevig', label: 'Hevig', color: 'bg-red-400' },
] as const;

const symptomChips = [
  { key: 'headache', label: 'Hoofdpijn' },
  { key: 'breast_tender', label: 'Gevoelige borsten' },
  { key: 'anxiety', label: 'Angst/onrust' },
  { key: 'hot_flashes', label: 'Opvliegers' },
  { key: 'bloating', label: 'Opgeblazen' },
  { key: 'irritability', label: 'Prikkelbaar' },
] as const;

export function CycleDayLogDialog({ open, onOpenChange, date }: CycleDayLogDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const logBleeding = useLogBleeding();
  const logSymptoms = useLogCycleSymptoms();
  const startCycle = useStartCycle();
  const deleteBleeding = useDeleteBleeding();

  // State
  const [tab, setTab] = useState<'bleeding' | 'symptoms'>('bleeding');
  const [intensity, setIntensity] = useState<BleedingLog['intensity'] | null>(null);
  const [painScore, setPainScore] = useState<number[]>([0]);
  const [isIntermenstrual, setIsIntermenstrual] = useState(false);
  const [energy, setEnergy] = useState<number[]>([5]);
  const [mood, setMood] = useState<number[]>([5]);
  const [symptoms, setSymptoms] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');

  // Fetch existing data for this date
  const { data: existingBleeding } = useQuery({
    queryKey: ['bleeding-log', user?.id, date],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('bleeding_logs')
        .select('*')
        .eq('owner_id', user.id)
        .eq('log_date', date)
        .maybeSingle();
      return data as BleedingLog | null;
    },
    enabled: !!user && open,
  });

  const { data: existingSymptoms } = useQuery({
    queryKey: ['cycle-symptom-log', user?.id, date],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('cycle_symptom_logs')
        .select('*')
        .eq('owner_id', user.id)
        .eq('log_date', date)
        .maybeSingle();
      return data as CycleSymptomLog | null;
    },
    enabled: !!user && open,
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingBleeding) {
      setIntensity(existingBleeding.intensity);
      setPainScore([existingBleeding.pain_score || 0]);
      setIsIntermenstrual(existingBleeding.is_intermenstrual);
    } else {
      setIntensity(null);
      setPainScore([0]);
      setIsIntermenstrual(false);
    }
  }, [existingBleeding]);

  useEffect(() => {
    if (existingSymptoms) {
      setEnergy([existingSymptoms.energy || 5]);
      setMood([existingSymptoms.mood || 5]);
      setSymptoms({
        headache: existingSymptoms.headache,
        breast_tender: existingSymptoms.breast_tender,
        anxiety: existingSymptoms.anxiety,
        hot_flashes: existingSymptoms.hot_flashes,
        bloating: existingSymptoms.bloating,
        irritability: existingSymptoms.irritability,
      });
      setNotes(existingSymptoms.notes || '');
    } else {
      setEnergy([5]);
      setMood([5]);
      setSymptoms({});
      setNotes('');
    }
  }, [existingSymptoms]);

  const handleSave = async () => {
    try {
      // If intensity is 'geen', delete any existing bleeding log
      if (intensity === 'geen') {
        await deleteBleeding.mutateAsync(date);
      } else if (intensity) {
        // Save bleeding log if intensity selected
        await logBleeding.mutateAsync({
          log_date: date,
          intensity,
          pain_score: painScore[0],
          is_intermenstrual: isIntermenstrual,
        });
      }

      // Save symptoms
      await logSymptoms.mutateAsync({
        log_date: date,
        energy: energy[0],
        mood: mood[0],
        headache: symptoms.headache || false,
        breast_tender: symptoms.breast_tender || false,
        anxiety: symptoms.anxiety || false,
        hot_flashes: symptoms.hot_flashes || false,
        bloating: symptoms.bloating || false,
        irritability: symptoms.irritability || false,
        notes: notes || null,
      });

      toast({ title: 'Opgeslagen!' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Kon niet opslaan', variant: 'destructive' });
    }
  };

  const handleDeleteBleeding = async () => {
    try {
      await deleteBleeding.mutateAsync(date);
      setIntensity(null);
      toast({ title: 'Bloedingsdata verwijderd' });
    } catch {
      toast({ title: 'Kon niet verwijderen', variant: 'destructive' });
    }
  };

  const isPending = logBleeding.isPending || logSymptoms.isPending || deleteBleeding.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {format(new Date(date), "EEEE d MMMM", { locale: nl })}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="bleeding" className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Bloedverlies
            </TabsTrigger>
            <TabsTrigger value="symptoms" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Hoe voel je je
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bleeding" className="space-y-6 mt-4">
            {/* Intensity */}
            <div className="space-y-3">
              <Label>Bloedverlies</Label>
              <div className="grid grid-cols-5 gap-2">
                {intensityOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={intensity === opt.value ? 'default' : 'outline'}
                    className={`text-xs px-2 ${intensity === opt.value ? '' : opt.color}`}
                    onClick={() => setIntensity(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Pain score */}
            {intensity && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Pijnscore</Label>
                  <span className="text-sm text-muted-foreground">{painScore[0]}/10</span>
                </div>
                <Slider
                  value={painScore}
                  onValueChange={setPainScore}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>
            )}

            {/* Intermenstrual */}
            {intensity && intensity !== 'geen' && (
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="intermenstrual"
                  checked={isIntermenstrual}
                  onCheckedChange={(c) => setIsIntermenstrual(!!c)}
                />
                <Label htmlFor="intermenstrual" className="text-sm cursor-pointer">
                  Dit is tussentijds bloedverlies (niet mijn menstruatie)
                </Label>
              </div>
            )}

            {/* Delete bleeding button */}
            {existingBleeding && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleDeleteBleeding}
                disabled={deleteBleeding.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Verwijder bloedingsdata voor deze dag
              </Button>
            )}
          </TabsContent>

          <TabsContent value="symptoms" className="space-y-6 mt-4">
            {/* Energy */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Energie</Label>
                <span className="text-sm text-muted-foreground">{energy[0]}/10</span>
              </div>
              <Slider value={energy} onValueChange={setEnergy} min={1} max={10} step={1} />
            </div>

            {/* Mood */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Stemming</Label>
                <span className="text-sm text-muted-foreground">{mood[0]}/10</span>
              </div>
              <Slider value={mood} onValueChange={setMood} min={1} max={10} step={1} />
            </div>


            {/* Symptom chips */}
            <div className="space-y-3">
              <Label>Symptomen</Label>
              <div className="flex flex-wrap gap-2">
                {symptomChips.map(({ key, label }) => (
                  <Button
                    key={key}
                    type="button"
                    variant={symptoms[key] ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSymptoms({ ...symptoms, [key]: !symptoms[key] })}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Iets bijzonders vandaag?"
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
