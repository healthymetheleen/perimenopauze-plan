import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Loader2, Utensils, Moon, Flower2, Dumbbell, Brain, AlertCircle } from 'lucide-react';
import { useCoachingPreferences, useUpdateCoachingPreferences } from '@/hooks/useCoachingPreferences';
import { useToast } from '@/hooks/use-toast';

const SYMPTOM_OPTIONS = [
  { code: 'hot_flashes', label: 'Opvliegers' },
  { code: 'headaches', label: 'Hoofdpijn' },
  { code: 'fatigue', label: 'Vermoeidheid' },
  { code: 'mood_swings', label: 'Stemmingswisselingen' },
  { code: 'brain_fog', label: 'Hersenmist' },
  { code: 'joint_pain', label: 'Gewrichtspijn' },
  { code: 'bloating', label: 'Opgeblazen gevoel' },
  { code: 'anxiety', label: 'Angst/spanning' },
];

export function CoachingPreferencesCard() {
  const { toast } = useToast();
  const { data: preferences, isLoading } = useCoachingPreferences();
  const updatePreferences = useUpdateCoachingPreferences();

  const [focusNutrition, setFocusNutrition] = useState(true);
  const [focusSleep, setFocusSleep] = useState(true);
  const [focusCycle, setFocusCycle] = useState(true);
  const [focusMovement, setFocusMovement] = useState(false);
  const [focusStress, setFocusStress] = useState(false);
  const [focusSymptoms, setFocusSymptoms] = useState<string[]>([]);
  const [personalContext, setPersonalContext] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync state when preferences load
  useEffect(() => {
    if (preferences) {
      setFocusNutrition(preferences.focus_nutrition);
      setFocusSleep(preferences.focus_sleep);
      setFocusCycle(preferences.focus_cycle);
      setFocusMovement(preferences.focus_movement);
      setFocusStress(preferences.focus_stress);
      setFocusSymptoms(preferences.focus_symptoms || []);
      setPersonalContext(preferences.personal_context || '');
    }
  }, [preferences]);

  // Track changes
  useEffect(() => {
    if (!preferences) {
      setHasChanges(true);
      return;
    }
    const changed =
      focusNutrition !== preferences.focus_nutrition ||
      focusSleep !== preferences.focus_sleep ||
      focusCycle !== preferences.focus_cycle ||
      focusMovement !== preferences.focus_movement ||
      focusStress !== preferences.focus_stress ||
      JSON.stringify(focusSymptoms) !== JSON.stringify(preferences.focus_symptoms || []) ||
      personalContext !== (preferences.personal_context || '');
    setHasChanges(changed);
  }, [preferences, focusNutrition, focusSleep, focusCycle, focusMovement, focusStress, focusSymptoms, personalContext]);

  const handleSave = async () => {
    try {
      await updatePreferences.mutateAsync({
        focus_nutrition: focusNutrition,
        focus_sleep: focusSleep,
        focus_cycle: focusCycle,
        focus_movement: focusMovement,
        focus_stress: focusStress,
        focus_symptoms: focusSymptoms,
        personal_context: personalContext.trim() || null,
      });
      toast({ title: 'Voorkeuren opgeslagen' });
    } catch {
      toast({ title: 'Kon voorkeuren niet opslaan', variant: 'destructive' });
    }
  };

  const toggleSymptom = (code: string) => {
    setFocusSymptoms(prev =>
      prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]
    );
  };

  if (isLoading) {
    return (
      <Card className="glass rounded-2xl">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Coaching Focus
        </CardTitle>
        <CardDescription>
          Bepaal waar de AI extra op let in analyses en adviezen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Focus areas */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Hoofdgebieden</Label>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Voeding & eetpatroon</span>
              </div>
              <Switch checked={focusNutrition} onCheckedChange={setFocusNutrition} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Slaap & rust</span>
              </div>
              <Switch checked={focusSleep} onCheckedChange={setFocusSleep} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flower2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Cyclus & hormonen</span>
              </div>
              <Switch checked={focusCycle} onCheckedChange={setFocusCycle} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Beweging & sport</span>
              </div>
              <Switch checked={focusMovement} onCheckedChange={setFocusMovement} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Stress & mentaal</span>
              </div>
              <Switch checked={focusStress} onCheckedChange={setFocusStress} />
            </div>
          </div>
        </div>

        {/* Symptom focus */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Specifieke klachten</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Selecteer klachten waar de AI extra aandacht aan besteedt
          </p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.map(symptom => (
              <Badge
                key={symptom.code}
                variant={focusSymptoms.includes(symptom.code) ? 'default' : 'outline'}
                className="cursor-pointer transition-colors"
                onClick={() => toggleSymptom(symptom.code)}
              >
                {symptom.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Personal context */}
        <div className="space-y-2">
          <Label htmlFor="personal-context" className="text-sm font-medium">
            Persoonlijke context (optioneel)
          </Label>
          <p className="text-xs text-muted-foreground">
            Extra informatie die de AI kan meenemen, bijv. "Ik werk in ploegendienst" of "Ik volg een vegetarisch dieet"
          </p>
          <Textarea
            id="personal-context"
            placeholder="Voeg hier relevante context toe..."
            value={personalContext}
            onChange={(e) => setPersonalContext(e.target.value)}
            className="min-h-[80px] resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {personalContext.length}/500
          </p>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updatePreferences.isPending}
          className="w-full"
        >
          {updatePreferences.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Voorkeuren opslaan
        </Button>
      </CardContent>
    </Card>
  );
}
