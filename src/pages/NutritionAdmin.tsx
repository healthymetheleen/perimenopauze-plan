import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast } from '@/hooks/use-toast';
import { useNutritionSettings, useUpdateNutritionSettings } from '@/hooks/useNutritionSettings';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { 
  Target, 
  AlertTriangle, 
  Check, 
  Minus, 
  Plus, 
  X, 
  Save,
  FileText
} from 'lucide-react';

export default function NutritionAdminPage() {
  const { toast } = useToast();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: settings, isLoading } = useNutritionSettings();
  const updateSettings = useUpdateNutritionSettings();

  // Form state
  const [targetKcal, setTargetKcal] = useState(2000);
  const [targetProtein, setTargetProtein] = useState(70);
  const [targetCarbs, setTargetCarbs] = useState(250);
  const [targetFat, setTargetFat] = useState(65);
  const [targetFiber, setTargetFiber] = useState(30);
  
  const [importantPoints, setImportantPoints] = useState<string[]>([]);
  const [lessImportantPoints, setLessImportantPoints] = useState<string[]>([]);
  const [noGoItems, setNoGoItems] = useState<string[]>([]);
  const [dietVision, setDietVision] = useState('');
  
  const [newImportant, setNewImportant] = useState('');
  const [newLessImportant, setNewLessImportant] = useState('');
  const [newNoGo, setNewNoGo] = useState('');

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setTargetKcal(settings.target_kcal);
      setTargetProtein(settings.target_protein_g);
      setTargetCarbs(settings.target_carbs_g);
      setTargetFat(settings.target_fat_g);
      setTargetFiber(settings.target_fiber_g);
      setImportantPoints(settings.important_points || []);
      setLessImportantPoints(settings.less_important_points || []);
      setNoGoItems(settings.no_go_items || []);
      setDietVision(settings.diet_vision || '');
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        target_kcal: targetKcal,
        target_protein_g: targetProtein,
        target_carbs_g: targetCarbs,
        target_fat_g: targetFat,
        target_fiber_g: targetFiber,
        important_points: importantPoints,
        less_important_points: lessImportantPoints,
        no_go_items: noGoItems,
        diet_vision: dietVision,
      });
      toast({ title: 'Instellingen opgeslagen! ✓' });
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
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gradient">Voedingsinstellingen</h1>
          <p className="text-muted-foreground">
            Configureer streefwaarden en dieetregels voor scores en AI-adviezen
          </p>
        </div>

        {/* Macronutrient Targets */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Dagelijkse streefwaarden
            </CardTitle>
            <CardDescription>
              Deze doelen worden gebruikt voor scoreberekening en AI-adviezen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kcal">Calorieën (kcal)</Label>
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
                <Label htmlFor="carbs">Koolhydraten (g)</Label>
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
              <div className="space-y-2 col-span-2 sm:col-span-1">
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

        {/* Important Points */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              Belangrijk
            </CardTitle>
            <CardDescription>
              Punten waar extra nadruk op wordt gelegd in scores en adviezen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {importantPoints.map((item) => (
                <Badge key={item} variant="secondary" className="bg-success/20 text-success-foreground">
                  {item}
                  <button
                    onClick={() => removeFromList(importantPoints, setImportantPoints, item)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Bijv: Voldoende eiwit"
                value={newImportant}
                onChange={(e) => setNewImportant(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToList(importantPoints, setImportantPoints, newImportant, setNewImportant)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => addToList(importantPoints, setImportantPoints, newImportant, setNewImportant)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Less Important Points */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Minus className="h-5 w-5 text-muted-foreground" />
              Minder belangrijk
            </CardTitle>
            <CardDescription>
              Punten waar minder streng op wordt gelet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {lessImportantPoints.map((item) => (
                <Badge key={item} variant="outline" className="text-muted-foreground">
                  {item}
                  <button
                    onClick={() => removeFromList(lessImportantPoints, setLessImportantPoints, item)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Bijv: Calorieën tellen niet strikt"
                value={newLessImportant}
                onChange={(e) => setNewLessImportant(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToList(lessImportantPoints, setLessImportantPoints, newLessImportant, setNewLessImportant)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => addToList(lessImportantPoints, setLessImportantPoints, newLessImportant, setNewLessImportant)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* No-Go Items */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              No-go's
            </CardTitle>
            <CardDescription>
              Voedingsmiddelen of gewoontes die vermeden moeten worden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {noGoItems.map((item) => (
                <Badge key={item} variant="destructive" className="bg-destructive/20 text-destructive">
                  {item}
                  <button
                    onClick={() => removeFromList(noGoItems, setNoGoItems, item)}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Bijv: Frisdrank"
                value={newNoGo}
                onChange={(e) => setNewNoGo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToList(noGoItems, setNoGoItems, newNoGo, setNewNoGo)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => addToList(noGoItems, setNoGoItems, newNoGo, setNewNoGo)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Diet Vision */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Dieetvisie
            </CardTitle>
            <CardDescription>
              Optioneel: beschrijf je algemene voedingsfilosofie (wordt meegenomen in AI-adviezen)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Bijv: Focus op whole foods, voldoende eiwit voor spieropbouw, geen strenge restricties maar bewust eten..."
              value={dietVision}
              onChange={(e) => setDietVision(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="w-full btn-gradient"
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateSettings.isPending ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </div>
    </AppLayout>
  );
}
