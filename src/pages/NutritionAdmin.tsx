import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { LoadingState } from '@/components/ui/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useNutritionSettings, useUpdateNutritionSettings, NutritionSettings } from '@/hooks/useNutritionSettings';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { 
  Target, AlertTriangle, Check, Minus, Plus, X, Save, FileText,
  Heart, Moon, Clock, Sparkles, Apple, MessageCircle, Info, Loader2, CheckCircle2
} from 'lucide-react';

const COACHING_STYLES = [
  { value: 'empathisch', label: 'Empathisch - Begripvol en ondersteunend' },
  { value: 'direct', label: 'Direct - Helder en to-the-point' },
  { value: 'motiverend', label: 'Motiverend - Aanmoedigend en positief' },
  { value: 'neutraal', label: 'Neutraal - Feitelijk en informatief' },
];

const COACHING_TONES = [
  { value: 'vriendelijk', label: 'Vriendelijk' },
  { value: 'professioneel', label: 'Professioneel' },
  { value: 'warm', label: 'Warm en persoonlijk' },
  { value: 'zakelijk', label: 'Zakelijk' },
];

const DEFAULT_PERIMENOPAUSE_FOCUS = [
  'hormoonbalans',
  'energieniveau', 
  'slaapkwaliteit',
  'stressmanagement',
  'gewichtsbeheersing',
  'botgezondheid',
  'hartgezondheid',
  'cognitieve functie',
];

export default function NutritionAdminPage() {
  const { toast } = useToast();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: settings, isLoading } = useNutritionSettings();
  const updateSettings = useUpdateNutritionSettings();

  // Basic targets
  const [targetKcal, setTargetKcal] = useState(2000);
  const [targetProtein, setTargetProtein] = useState(70);
  const [targetCarbs, setTargetCarbs] = useState(250);
  const [targetFat, setTargetFat] = useState(65);
  const [targetFiber, setTargetFiber] = useState(30);
  
  // Extended targets
  const [targetProteinPerKg, setTargetProteinPerKg] = useState(1.6);
  const [targetSleepHours, setTargetSleepHours] = useState(8.0);
  const [targetEatingWindow, setTargetEatingWindow] = useState(10);
  
  // Lists
  const [importantPoints, setImportantPoints] = useState<string[]>([]);
  const [lessImportantPoints, setLessImportantPoints] = useState<string[]>([]);
  const [noGoItems, setNoGoItems] = useState<string[]>([]);
  const [preferIngredients, setPreferIngredients] = useState<string[]>([]);
  const [avoidIngredients, setAvoidIngredients] = useState<string[]>([]);
  
  const [perimenopauseFocus, setPerimenopauseFocus] = useState<string[]>([]);
  
  // Coaching
  const [coachingStyle, setCoachingStyle] = useState('empathisch');
  const [coachingTone, setCoachingTone] = useState('vriendelijk');
  const [coachingContext, setCoachingContext] = useState('');
  const [dietVision, setDietVision] = useState('');
  const [appPhilosophy, setAppPhilosophy] = useState('');
  
  // New item inputs
  const [newImportant, setNewImportant] = useState('');
  const [newLessImportant, setNewLessImportant] = useState('');
  const [newNoGo, setNewNoGo] = useState('');
  const [newPrefer, setNewPrefer] = useState('');
  const [newAvoid, setNewAvoid] = useState('');
  
  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const isInitialMount = useRef(true);
  const hasInitialized = useRef(false);

  // Load settings into form
  useEffect(() => {
    if (settings && !hasInitialized.current) {
      setTargetKcal(settings.target_kcal);
      setTargetProtein(settings.target_protein_g);
      setTargetCarbs(settings.target_carbs_g);
      setTargetFat(settings.target_fat_g);
      setTargetFiber(settings.target_fiber_g);
      setTargetProteinPerKg(settings.target_protein_per_kg);
      setTargetSleepHours(settings.target_sleep_hours);
      setTargetEatingWindow(settings.target_eating_window_hours);
      setImportantPoints(settings.important_points || []);
      setLessImportantPoints(settings.less_important_points || []);
      setNoGoItems(settings.no_go_items || []);
      setPreferIngredients(settings.prefer_ingredients || []);
      setAvoidIngredients(settings.avoid_ingredients || []);
      
      setPerimenopauseFocus(settings.perimenopause_focus || []);
      setCoachingStyle(settings.coaching_style || 'empathisch');
      setCoachingTone(settings.coaching_tone || 'vriendelijk');
      setCoachingContext(settings.coaching_context || '');
      setDietVision(settings.diet_vision || '');
      setAppPhilosophy(settings.app_philosophy || '');
      
      hasInitialized.current = true;
      // Mark initial mount complete after a short delay
      setTimeout(() => {
        isInitialMount.current = false;
      }, 100);
    }
  }, [settings]);

  // Auto-save function
  const performAutoSave = useCallback(async (settingsToSave: Partial<NutritionSettings>) => {
    if (isInitialMount.current) return;
    
    setAutoSaveStatus('saving');
    try {
      await updateSettings.mutateAsync(settingsToSave);
      setAutoSaveStatus('saved');
      // Reset to idle after 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch {
      setAutoSaveStatus('idle');
      toast({ title: 'Auto-save mislukt', variant: 'destructive' });
    }
  }, [updateSettings, toast]);

  // Debounced auto-save for text fields (1 second delay)
  const debouncedAutoSave = useDebouncedCallback(performAutoSave, 1000);

  // Get current settings object
  const getCurrentSettings = useCallback((): Partial<NutritionSettings> => ({
    target_kcal: targetKcal,
    target_protein_g: targetProtein,
    target_carbs_g: targetCarbs,
    target_fat_g: targetFat,
    target_fiber_g: targetFiber,
    target_protein_per_kg: targetProteinPerKg,
    target_sleep_hours: targetSleepHours,
    target_eating_window_hours: targetEatingWindow,
    important_points: importantPoints,
    less_important_points: lessImportantPoints,
    no_go_items: noGoItems,
    prefer_ingredients: preferIngredients,
    avoid_ingredients: avoidIngredients,
    perimenopause_focus: perimenopauseFocus,
    coaching_style: coachingStyle,
    coaching_tone: coachingTone,
    coaching_context: coachingContext || null,
    diet_vision: dietVision,
    app_philosophy: appPhilosophy,
  }), [
    targetKcal, targetProtein, targetCarbs, targetFat, targetFiber,
    targetProteinPerKg, targetSleepHours, targetEatingWindow,
    importantPoints, lessImportantPoints, noGoItems, preferIngredients, avoidIngredients,
    perimenopauseFocus, coachingStyle, coachingTone, coachingContext, dietVision, appPhilosophy
  ]);

  // Auto-save effect for immediate fields (numbers, selects, lists)
  useEffect(() => {
    if (isInitialMount.current || !hasInitialized.current) return;
    performAutoSave(getCurrentSettings());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    targetKcal, targetProtein, targetCarbs, targetFat, targetFiber,
    targetProteinPerKg, targetSleepHours, targetEatingWindow,
    importantPoints, lessImportantPoints, noGoItems, preferIngredients, avoidIngredients,
    perimenopauseFocus, coachingStyle, coachingTone
  ]);

  // Debounced auto-save effect for text fields
  useEffect(() => {
    if (isInitialMount.current || !hasInitialized.current) return;
    debouncedAutoSave(getCurrentSettings());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dietVision, appPhilosophy, coachingContext]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(getCurrentSettings());
      toast({ title: 'Coaching instellingen opgeslagen! ✓' });
    } catch {
      toast({ title: 'Kon niet opslaan', variant: 'destructive' });
    }
  };

  const addToList = (
    list: string[],
    setList: (l: string[]) => void,
    value: string,
    setValue: (v: string) => void
  ) => {
    if (value.trim() && !list.includes(value.trim())) {
      setList([...list, value.trim()]);
      setValue('');
    }
  };

  const removeFromList = (list: string[], setList: (l: string[]) => void, item: string) => {
    setList(list.filter(i => i !== item));
  };

  const toggleFocus = (focus: string) => {
    if (perimenopauseFocus.includes(focus)) {
      setPerimenopauseFocus(perimenopauseFocus.filter(f => f !== focus));
    } else {
      setPerimenopauseFocus([...perimenopauseFocus, focus]);
    }
  };

  // Redirect non-admins
  if (!adminLoading && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading || adminLoading) {
    return (
      <AppLayout>
        <LoadingState message="Instellingen laden..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl mx-auto pb-20">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gradient">Coaching & Voedingsinstellingen</h1>
          <p className="text-muted-foreground">
            Configureer de AI-coaching stijl en alle adviezen voor perimenopauze
          </p>
        </div>

        <Alert className="glass border-primary/30">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Let op:</strong> Alle instellingen hier bepalen hoe de AI-coach communiceert en adviseert. 
            Dit is de "stem" van de app - alle prompts en adviezen worden hierdoor beïnvloed.
          </AlertDescription>
        </Alert>

        {/* App Philosophy - Most Important */}
        <Card className="glass rounded-2xl border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              App Filosofie & Kernboodschap
            </CardTitle>
            <CardDescription>
              Deze tekst wordt meegenomen in ALLE AI-prompts als context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Perimenopauze Plan helpt vrouwen 35+ om via voeding, beweging en leefstijl hun hormoonbalans te ondersteunen..."
              value={appPhilosophy}
              onChange={(e) => setAppPhilosophy(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Coaching Style */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Coaching Stijl
            </CardTitle>
            <CardDescription>
              Hoe communiceert de AI-coach met gebruikers?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Communicatiestijl</Label>
                <Select value={coachingStyle} onValueChange={setCoachingStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COACHING_STYLES.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Toon</Label>
                <Select value={coachingTone} onValueChange={setCoachingTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COACHING_TONES.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Extra context voor de coach</Label>
              <Textarea
                placeholder="Bijv: Gebruik geen termen als 'dieet', focus op 'voedingspatroon'. Vermijd woorden als 'moeten' of 'niet mogen'..."
                value={coachingContext}
                onChange={(e) => setCoachingContext(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Perimenopause Focus */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Perimenopauze Focus Gebieden
            </CardTitle>
            <CardDescription>
              Selecteer welke aspecten centraal staan in de adviezen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_PERIMENOPAUSE_FOCUS.map((focus) => (
                <Badge
                  key={focus}
                  variant={perimenopauseFocus.includes(focus) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleFocus(focus)}
                >
                  {perimenopauseFocus.includes(focus) && <Check className="h-3 w-3 mr-1" />}
                  {focus}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Targets */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Streefwaarden
            </CardTitle>
            <CardDescription>
              Dagelijkse doelen voor voeding, slaap en eetwindow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Lifestyle targets */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="protein-kg" className="flex items-center gap-1">
                  Eiwit/kg
                </Label>
                <Input
                  id="protein-kg"
                  type="number"
                  step="0.1"
                  value={targetProteinPerKg}
                  onChange={(e) => setTargetProteinPerKg(parseFloat(e.target.value) || 1.6)}
                />
                <p className="text-xs text-muted-foreground">gram per kg</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sleep" className="flex items-center gap-1">
                  <Moon className="h-3 w-3" /> Slaap
                </Label>
                <Input
                  id="sleep"
                  type="number"
                  step="0.5"
                  value={targetSleepHours}
                  onChange={(e) => setTargetSleepHours(parseFloat(e.target.value) || 8)}
                />
                <p className="text-xs text-muted-foreground">uren per nacht</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eating-window" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Eetwindow
                </Label>
                <Input
                  id="eating-window"
                  type="number"
                  value={targetEatingWindow}
                  onChange={(e) => setTargetEatingWindow(parseInt(e.target.value) || 10)}
                />
                <p className="text-xs text-muted-foreground">uren max</p>
              </div>
            </div>

            <Separator />

            {/* Macro targets */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kcal">kcal</Label>
                <Input
                  id="kcal"
                  type="number"
                  value={targetKcal}
                  onChange={(e) => setTargetKcal(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Eiwit (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={targetProtein}
                  onChange={(e) => setTargetProtein(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Koolh (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={targetCarbs}
                  onChange={(e) => setTargetCarbs(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Vet (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  value={targetFat}
                  onChange={(e) => setTargetFat(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiber">Vezels (g)</Label>
                <Input
                  id="fiber"
                  type="number"
                  value={targetFiber}
                  onChange={(e) => setTargetFiber(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Food Preferences */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Apple className="h-5 w-5 text-success" />
              Voedingsvoorkeuren
            </CardTitle>
            <CardDescription>
              Ingrediënten die aangeraden of vermeden moeten worden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Prefer */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Aanbevolen ingrediënten
              </Label>
              <div className="flex flex-wrap gap-2">
                {preferIngredients.map((item) => (
                  <Badge key={item} variant="secondary" className="bg-success/20 text-success-foreground">
                    {item}
                    <button onClick={() => removeFromList(preferIngredients, setPreferIngredients, item)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Bijv: vette vis, bladgroenten, noten"
                  value={newPrefer}
                  onChange={(e) => setNewPrefer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addToList(preferIngredients, setPreferIngredients, newPrefer, setNewPrefer)}
                />
                <Button variant="outline" size="icon" onClick={() => addToList(preferIngredients, setPreferIngredients, newPrefer, setNewPrefer)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Avoid */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <X className="h-4 w-4 text-destructive" />
                Te vermijden ingrediënten
              </Label>
              <div className="flex flex-wrap gap-2">
                {avoidIngredients.map((item) => (
                  <Badge key={item} variant="destructive" className="bg-destructive/20 text-destructive">
                    {item}
                    <button onClick={() => removeFromList(avoidIngredients, setAvoidIngredients, item)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Bijv: geraffineerde suiker, alcohol, bewerkt vlees"
                  value={newAvoid}
                  onChange={(e) => setNewAvoid(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addToList(avoidIngredients, setAvoidIngredients, newAvoid, setNewAvoid)}
                />
                <Button variant="outline" size="icon" onClick={() => addToList(avoidIngredients, setAvoidIngredients, newAvoid, setNewAvoid)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Disclaimer - Important notice */}
        <Alert className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm">
            <strong>Belangrijk:</strong> Deze app geeft GEEN supplementadvies, medische claims, 
            diagnoses of behandeladviezen. Alle adviezen zijn gericht op algemene leefstijl en voeding.
          </AlertDescription>
        </Alert>

        {/* Priority Points */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              Prioriteiten voor Coaching
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Important */}
            <div className="space-y-3">
              <Label>Heel belangrijk (extra nadruk)</Label>
              <div className="flex flex-wrap gap-2">
                {importantPoints.map((item) => (
                  <Badge key={item} variant="secondary" className="bg-success/20 text-success-foreground">
                    {item}
                    <button onClick={() => removeFromList(importantPoints, setImportantPoints, item)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Bijv: Voldoende eiwit bij elke maaltijd"
                  value={newImportant}
                  onChange={(e) => setNewImportant(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addToList(importantPoints, setImportantPoints, newImportant, setNewImportant)}
                />
                <Button variant="outline" size="icon" onClick={() => addToList(importantPoints, setImportantPoints, newImportant, setNewImportant)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Less Important */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-muted-foreground" />
                Minder belangrijk (niet streng op)
              </Label>
              <div className="flex flex-wrap gap-2">
                {lessImportantPoints.map((item) => (
                  <Badge key={item} variant="outline" className="text-muted-foreground">
                    {item}
                    <button onClick={() => removeFromList(lessImportantPoints, setLessImportantPoints, item)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Bijv: Exacte calorieën"
                  value={newLessImportant}
                  onChange={(e) => setNewLessImportant(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addToList(lessImportantPoints, setLessImportantPoints, newLessImportant, setNewLessImportant)}
                />
                <Button variant="outline" size="icon" onClick={() => addToList(lessImportantPoints, setLessImportantPoints, newLessImportant, setNewLessImportant)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* No-Go */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Absolute no-go's
              </Label>
              <div className="flex flex-wrap gap-2">
                {noGoItems.map((item) => (
                  <Badge key={item} variant="destructive" className="bg-destructive/20 text-destructive">
                    {item}
                    <button onClick={() => removeFromList(noGoItems, setNoGoItems, item)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Bijv: Crash diëten, extreme restricties"
                  value={newNoGo}
                  onChange={(e) => setNewNoGo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addToList(noGoItems, setNoGoItems, newNoGo, setNewNoGo)}
                />
                <Button variant="outline" size="icon" onClick={() => addToList(noGoItems, setNoGoItems, newNoGo, setNewNoGo)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diet Vision */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Voedingsvisie (vrije tekst)
            </CardTitle>
            <CardDescription>
              Aanvullende context voor AI-adviezen over voeding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Bijv: Focus op whole foods, intuïtief eten, geen strenge regels maar bewuste keuzes. Extra aandacht voor eiwit en gevarieerde voeding..."
              value={dietVision}
              onChange={(e) => setDietVision(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Auto-save status indicator */}
        <div className="fixed bottom-20 left-0 right-0 px-4 z-50">
          <div className="max-w-2xl mx-auto flex justify-center">
            {autoSaveStatus === 'saving' && (
              <div className="flex items-center gap-2 bg-background/95 backdrop-blur px-4 py-2 rounded-full shadow-lg border">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Opslaan...</span>
              </div>
            )}
            {autoSaveStatus === 'saved' && (
              <div className="flex items-center gap-2 bg-background/95 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-green-500/30">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Opgeslagen</span>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Save Button */}
        <div className="fixed bottom-4 left-0 right-0 px-4 z-50">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending || autoSaveStatus === 'saving'}
              className="w-full btn-gradient shadow-lg"
              size="lg"
            >
              {updateSettings.isPending || autoSaveStatus === 'saving' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opslaan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Alle instellingen opslaan
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
