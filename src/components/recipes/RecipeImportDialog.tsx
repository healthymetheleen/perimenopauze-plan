import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateRecipe, RecipeInsert, Ingredient, mealTypes, seasons, cyclePhases, dietTags } from '@/hooks/useRecipes';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileJson, Sparkles, Check, X, ChefHat, Clock, Leaf, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLatestPrediction, useCyclePreferences } from '@/hooks/useCycle';
import { useRecipePreferences } from '@/hooks/useRecipePreferences';
import { getWeatherSeason, getMealTypeFromTime, detectHemisphere, Hemisphere } from '@/lib/seasonUtils';

interface RecipeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRecipe extends RecipeInsert {
  _selected?: boolean;
}

// Map cycle seasons to cycle phases
const seasonToCyclePhase: Record<string, string> = {
  winter: 'menstruatie',
  lente: 'folliculair',
  zomer: 'ovulatie',
  herfst: 'luteaal',
};

// Normalize diet tags: if vegan, add vegetarisch; if lactosevrij, add zuivelvrij
function normalizeDietTags(tags: string[]): string[] {
  const normalized = new Set(tags);
  if (normalized.has('veganistisch')) {
    normalized.add('vegetarisch');
  }
  if (normalized.has('lactosevrij')) {
    normalized.add('zuivelvrij');
  }
  return Array.from(normalized);
}

export function RecipeImportDialog({ open, onOpenChange }: RecipeImportDialogProps) {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const createRecipe = useCreateRecipe();

  const [tab, setTab] = useState<'json' | 'ai'>('json');
  const [jsonInput, setJsonInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [recipeCount, setRecipeCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedRecipes, setParsedRecipes] = useState<ParsedRecipe[]>([]);
  const [importing, setImporting] = useState(false);
  
  // Auto-detected context
  const [hemisphere, setHemisphere] = useState<Hemisphere>('north');
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [selectedWeatherSeason, setSelectedWeatherSeason] = useState<string>('');
  const [selectedCyclePhase, setSelectedCyclePhase] = useState<string>('');
  const [selectedDietTags, setSelectedDietTags] = useState<string[]>([]);
  
  // Get cycle prediction and preferences
  const { data: prediction } = useLatestPrediction();
  const { data: cyclePrefs } = useCyclePreferences();
  const { savedAllergyTags } = useRecipePreferences();
  
  // Detect hemisphere on mount
  useEffect(() => {
    detectHemisphere().then(setHemisphere);
  }, []);
  
  // Auto-fill context when dialog opens
  useEffect(() => {
    if (open) {
      // Auto-detect meal type from time of day
      setSelectedMealType(getMealTypeFromTime());
      
      // Auto-detect weather season based on hemisphere
      setSelectedWeatherSeason(getWeatherSeason(hemisphere));
      
      // Auto-detect cycle phase from prediction
      const currentCycleSeason = prediction?.current_season;
      if (currentCycleSeason && cyclePrefs?.onboarding_completed) {
        setSelectedCyclePhase(seasonToCyclePhase[currentCycleSeason] || '');
      }
      
      // Pre-fill diet tags from saved allergies
      if (savedAllergyTags.length > 0) {
        setSelectedDietTags(savedAllergyTags);
      }
    }
  }, [open, hemisphere, prediction, cyclePrefs, savedAllergyTags]);

  const resetState = () => {
    setJsonInput('');
    setAiPrompt('');
    setParsedRecipes([]);
  };

  const handleJsonParse = () => {
    try {
      let recipes = JSON.parse(jsonInput);
      if (!Array.isArray(recipes)) {
        recipes = [recipes];
      }
      
      // Validate and map
      const mapped: ParsedRecipe[] = recipes.map((r: any) => ({
        title: r.title || t('recipeImport.untitledRecipe'),
        description: r.description || null,
        instructions: r.instructions || '',
        prep_time_minutes: r.prep_time_minutes || null,
        cook_time_minutes: r.cook_time_minutes || null,
        servings: r.servings || 4,
        meal_type: r.meal_type || 'diner',
        seasons: r.seasons || [],
        cycle_phases: r.cycle_phases || [],
        diet_tags: normalizeDietTags(r.diet_tags || []),
        ingredients: (r.ingredients || []).map((i: any) => ({
          name: i.name || '',
          amount: String(i.amount || ''),
          unit: i.unit || '',
        })),
        kcal: r.kcal || null,
        protein_g: r.protein_g || null,
        carbs_g: r.carbs_g || null,
        fat_g: r.fat_g || null,
        fiber_g: r.fiber_g || null,
        is_published: false,
        _selected: true,
      }));

      setParsedRecipes(mapped);
      toast({ title: t('recipeImport.recipesGenerated', { count: mapped.length }) });
    } catch (e) {
      toast({ title: t('recipeImport.invalidJson'), variant: 'destructive' });
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: t('recipeImport.enterPrompt'), variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipes', {
        body: { 
          prompt: aiPrompt, 
          count: recipeCount, 
          language: i18n.language,
          mealType: selectedMealType || undefined,
          weatherSeason: selectedWeatherSeason || undefined,
          cyclePhase: selectedCyclePhase || undefined,
          dietTags: selectedDietTags.length > 0 ? selectedDietTags : undefined,
          hemisphere,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const recipes: ParsedRecipe[] = data.recipes.map((r: any) => ({
        title: r.title || t('recipeImport.untitledRecipe'),
        description: r.description || null,
        instructions: r.instructions || '',
        prep_time_minutes: r.prep_time_minutes || null,
        cook_time_minutes: r.cook_time_minutes || null,
        servings: r.servings || 4,
        meal_type: r.meal_type || selectedMealType || 'diner',
        seasons: r.seasons || (selectedWeatherSeason ? [selectedWeatherSeason] : []),
        cycle_phases: r.cycle_phases || (selectedCyclePhase ? [selectedCyclePhase] : []),
        diet_tags: normalizeDietTags([...(r.diet_tags || []), ...selectedDietTags]),
        ingredients: (r.ingredients || []).map((i: any) => ({
          name: i.name || i.item || '',
          amount: String(i.amount || ''),
          unit: i.unit || '',
        })),
        kcal: r.kcal || null,
        protein_g: r.protein_g || null,
        carbs_g: r.carbs_g || null,
        fat_g: r.fat_g || null,
        fiber_g: r.fiber_g || null,
        is_published: false,
        _selected: true,
      }));

      setParsedRecipes(recipes);
      toast({ title: t('recipeImport.recipesGenerated', { count: recipes.length }) });
    } catch (e: any) {
      console.error('AI generation error:', e);
      toast({ 
        title: t('recipeImport.generationFailed'), 
        description: e.message || t('recipeImport.tryAgain'),
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleDietTag = (tag: string) => {
    setSelectedDietTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleRecipe = (index: number) => {
    setParsedRecipes(prev => 
      prev.map((r, i) => i === index ? { ...r, _selected: !r._selected } : r)
    );
  };

  const selectAll = (selected: boolean) => {
    setParsedRecipes(prev => prev.map(r => ({ ...r, _selected: selected })));
  };

  const handleImport = async () => {
    const toImport = parsedRecipes.filter(r => r._selected);
    if (toImport.length === 0) {
      toast({ title: t('recipeImport.selectAtLeastOne'), variant: 'destructive' });
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const recipe of toImport) {
      try {
        const { _selected, ...recipeData } = recipe;
        await createRecipe.mutateAsync(recipeData);
        successCount++;
      } catch (e) {
        console.error('Import error:', e);
        errorCount++;
      }
    }

    setImporting(false);
    
    if (successCount > 0) {
      toast({ title: t('recipeImport.recipesImported', { count: successCount }) });
    }
    if (errorCount > 0) {
      toast({ title: t('recipeImport.recipesFailed', { count: errorCount }), variant: 'destructive' });
    }

    if (successCount > 0 && errorCount === 0) {
      resetState();
      onOpenChange(false);
    }
  };

  const selectedCount = parsedRecipes.filter(r => r._selected).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('recipeImport.title')}</DialogTitle>
          <DialogDescription>
            {t('recipeImport.description')}
          </DialogDescription>
        </DialogHeader>

        {parsedRecipes.length === 0 ? (
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="json" className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                {t('recipeImport.tabJson')}
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {t('recipeImport.tabAi')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="json" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t('recipeImport.jsonLabel')}</Label>
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={t('recipeImport.jsonPlaceholder')}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <Button onClick={handleJsonParse} disabled={!jsonInput.trim()}>
                {t('recipeImport.jsonProcess')}
              </Button>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t('recipeImport.aiDescribeLabel')}</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={t('recipeImport.aiPlaceholder')}
                  rows={3}
                />
              </div>
              
              {/* Context selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Maaltijd
                  </Label>
                  <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Kies moment" />
                    </SelectTrigger>
                    <SelectContent>
                      {mealTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {t(type.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Leaf className="h-3 w-3" />
                    Weerseizoen
                  </Label>
                  <Select value={selectedWeatherSeason} onValueChange={setSelectedWeatherSeason}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Kies seizoen" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Moon className="h-3 w-3" />
                    Cyclusfase
                  </Label>
                  <Select value={selectedCyclePhase} onValueChange={setSelectedCyclePhase}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Optioneel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Geen voorkeur</SelectItem>
                      {cyclePhases.map((phase) => (
                        <SelectItem key={phase.value} value={phase.value}>
                          {phase.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('recipeImport.recipeCount')}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={recipeCount}
                    onChange={(e) => setRecipeCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                    className="h-9"
                  />
                </div>
              </div>
              
              {/* Diet tags */}
              <div className="space-y-2">
                <Label className="text-xs">Dieetwensen (opgeslagen voorkeuren + extra)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {dietTags.slice(0, 12).map((tag) => (
                    <Badge
                      key={tag.value}
                      variant={selectedDietTags.includes(tag.value) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleDietTag(tag.value)}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Button onClick={handleAiGenerate} disabled={isLoading || !aiPrompt.trim()} className="w-full">
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Sparkles className="h-4 w-4 mr-2" />
                {isLoading ? t('recipeImport.generating') : t('recipeImport.generate')}
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('recipeImport.selectedOf', { selected: selectedCount, total: parsedRecipes.length })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => selectAll(true)}>
                  {t('recipeImport.selectAll')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectAll(false)}>
                  {t('recipeImport.deselectAll')}
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {parsedRecipes.map((recipe, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    recipe._selected ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                  }`}
                >
                  <Checkbox
                    checked={recipe._selected}
                    onCheckedChange={() => toggleRecipe(idx)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ChefHat className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{recipe.title}</span>
                    </div>
                    {recipe.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {recipe.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">{recipe.meal_type}</Badge>
                      {recipe.protein_g && (
                        <Badge variant="outline" className="text-xs">{recipe.protein_g}g {t('recipeImport.protein')}</Badge>
                      )}
                      {recipe.ingredients.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {recipe.ingredients.length} {t('recipeImport.ingredients')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setParsedRecipes([])} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                {t('recipeImport.back')}
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={importing || selectedCount === 0}
                className="flex-1"
              >
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Check className="h-4 w-4 mr-2" />
                {t('recipeImport.import', { count: selectedCount })}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
