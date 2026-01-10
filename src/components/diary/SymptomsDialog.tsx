import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, X } from 'lucide-react';

interface SymptomsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: string;
}

interface SymptomCatalogItem {
  code: string;
  label_nl: string;
  domain: string;
}

interface SymptomEntry {
  code: string;
  severity: number;
}

export function SymptomsDialog({ open, onOpenChange, dayId }: SymptomsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomEntry[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');

  // Fetch symptom catalog
  const { data: catalog } = useQuery({
    queryKey: ['symptom-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_symptom_catalog')
        .select('code, label_nl, domain')
        .order('domain')
        .order('label_nl');
      if (error) throw error;
      return data as SymptomCatalogItem[];
    },
    enabled: open,
  });

  // Fetch existing symptoms for this day
  const { data: existingSymptoms } = useQuery({
    queryKey: ['symptoms', dayId],
    queryFn: async () => {
      if (!user || !dayId) return [];
      const { data, error } = await supabase
        .from('symptoms')
        .select('symptom_code, severity_0_10')
        .eq('day_id' as never, dayId)
        .eq('owner_id' as never, user.id);
      if (error) throw error;
      const symptoms = (data || []) as unknown as { symptom_code: string; severity_0_10: number }[];
      return symptoms.map(s => ({ code: s.symptom_code, severity: s.severity_0_10 }));
    },
    enabled: !!user && !!dayId && open,
  });

  // Load existing symptoms when data arrives
  useEffect(() => {
    if (existingSymptoms?.length) {
      setSelectedSymptoms(existingSymptoms);
    }
  }, [existingSymptoms]);

  const addSymptom = () => {
    if (!selectedCode || selectedSymptoms.some(s => s.code === selectedCode)) return;
    setSelectedSymptoms([...selectedSymptoms, { code: selectedCode, severity: 5 }]);
    setSelectedCode('');
  };

  const removeSymptom = (code: string) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s.code !== code));
  };

  const updateSeverity = (code: string, severity: number) => {
    setSelectedSymptoms(selectedSymptoms.map(s => 
      s.code === code ? { ...s, severity } : s
    ));
  };

  const saveSymptoms = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Delete existing symptoms for this day
      await supabase
        .from('symptoms')
        .delete()
        .eq('day_id' as never, dayId)
        .eq('owner_id' as never, user.id);

      // Insert new symptoms
      if (selectedSymptoms.length > 0) {
        const { error } = await supabase
          .from('symptoms')
          .insert(
            selectedSymptoms.map(s => ({
              owner_id: user.id,
              day_id: dayId,
              symptom_code: s.code,
              severity_0_10: s.severity,
            })) as never[]
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Symptomen opgeslagen' });
      queryClient.invalidateQueries({ queryKey: ['symptoms', dayId] });
      queryClient.invalidateQueries({ queryKey: ['daily-scores'] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Kon symptomen niet opslaan', variant: 'destructive' });
    },
  });

  const getSymptomLabel = (code: string) => {
    return catalog?.find(c => c.code === code)?.label_nl || code;
  };

  const availableSymptoms = catalog?.filter(
    c => !selectedSymptoms.some(s => s.code === c.code)
  ) || [];

  // Group by domain
  const groupedSymptoms: Record<string, SymptomCatalogItem[]> = {};
  availableSymptoms.forEach(s => {
    if (!groupedSymptoms[s.domain]) groupedSymptoms[s.domain] = [];
    groupedSymptoms[s.domain].push(s);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Symptomen registreren</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Add symptom selector */}
          <div className="flex gap-2">
            <Select value={selectedCode} onValueChange={setSelectedCode}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Kies een symptoom..." />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-64">
                  {Object.entries(groupedSymptoms).map(([domain, symptoms]) => (
                    <div key={domain}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                        {domain}
                      </div>
                      {symptoms.map(s => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.label_nl}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            <Button type="button" size="icon" onClick={addSymptom} disabled={!selectedCode}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected symptoms list */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {selectedSymptoms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Geen symptomen geselecteerd
                </p>
              ) : (
                selectedSymptoms.map(symptom => (
                  <div key={symptom.code} className="p-3 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{getSymptomLabel(symptom.code)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeSymptom(symptom.code)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Intensiteit</span>
                        <span>{symptom.severity}/10</span>
                      </div>
                      <Slider
                        value={[symptom.severity]}
                        onValueChange={([v]) => updateSeverity(symptom.code, v)}
                        min={0}
                        max={10}
                        step={1}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            type="button" 
            className="flex-1" 
            onClick={() => saveSymptoms.mutate()}
            disabled={saveSymptoms.isPending}
          >
            {saveSymptoms.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
