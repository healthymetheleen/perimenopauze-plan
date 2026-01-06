import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useCreateRecipe, RecipeInsert, Ingredient } from '@/hooks/useRecipes';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileJson, Sparkles, Check, X, ChefHat } from 'lucide-react';

interface RecipeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRecipe extends RecipeInsert {
  _selected?: boolean;
}

export function RecipeImportDialog({ open, onOpenChange }: RecipeImportDialogProps) {
  const { toast } = useToast();
  const createRecipe = useCreateRecipe();

  const [tab, setTab] = useState<'json' | 'ai'>('json');
  const [jsonInput, setJsonInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [recipeCount, setRecipeCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedRecipes, setParsedRecipes] = useState<ParsedRecipe[]>([]);
  const [importing, setImporting] = useState(false);

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
        title: r.title || 'Naamloos recept',
        description: r.description || null,
        instructions: r.instructions || '',
        prep_time_minutes: r.prep_time_minutes || null,
        cook_time_minutes: r.cook_time_minutes || null,
        servings: r.servings || 4,
        meal_type: r.meal_type || 'diner',
        seasons: r.seasons || [],
        diet_tags: r.diet_tags || [],
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
      toast({ title: `${mapped.length} recepten gevonden` });
    } catch (e) {
      toast({ title: 'Ongeldige JSON', variant: 'destructive' });
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: 'Voer een prompt in', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipes', {
        body: { prompt: aiPrompt, count: recipeCount },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const recipes: ParsedRecipe[] = data.recipes.map((r: any) => ({
        title: r.title || 'Naamloos recept',
        description: r.description || null,
        instructions: r.instructions || '',
        prep_time_minutes: r.prep_time_minutes || null,
        cook_time_minutes: r.cook_time_minutes || null,
        servings: r.servings || 4,
        meal_type: r.meal_type || 'diner',
        seasons: r.seasons || [],
        diet_tags: r.diet_tags || [],
        // Filter out is_seasonal from ingredients as it's not in the DB schema
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

      setParsedRecipes(recipes);
      toast({ title: `${recipes.length} recepten gegenereerd` });
    } catch (e: any) {
      console.error('AI generation error:', e);
      toast({ 
        title: 'Genereren mislukt', 
        description: e.message || 'Probeer het opnieuw',
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
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
      toast({ title: 'Selecteer minimaal 1 recept', variant: 'destructive' });
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
      toast({ title: `${successCount} recepten geïmporteerd` });
    }
    if (errorCount > 0) {
      toast({ title: `${errorCount} recepten mislukt`, variant: 'destructive' });
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
          <DialogTitle>Recepten importeren</DialogTitle>
          <DialogDescription>
            Importeer meerdere recepten via JSON of laat AI recepten genereren
          </DialogDescription>
        </DialogHeader>

        {parsedRecipes.length === 0 ? (
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="json" className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                JSON import
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI generatie
              </TabsTrigger>
            </TabsList>

            <TabsContent value="json" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>JSON recepten</Label>
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`[
  {
    "title": "Eiwitrijke havermout",
    "description": "Gezond ontbijt",
    "instructions": "1. Kook havermout...",
    "meal_type": "ontbijt",
    "servings": 2,
    "ingredients": [
      { "name": "havermout", "amount": "100", "unit": "gram" }
    ]
  }
]`}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <Button onClick={handleJsonParse} disabled={!jsonInput.trim()}>
                JSON verwerken
              </Button>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Beschrijf welke recepten je wilt</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Bijv: 10 eiwitrijke ontbijtrecepten voor perimenopauze, minimaal 25g eiwit per portie, makkelijk te maken in 15 minuten"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Aantal recepten (max 10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={recipeCount}
                  onChange={(e) => setRecipeCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">
                  Voor meer recepten, genereer meerdere keren met verschillende prompts
                </p>
              </div>
              <Button onClick={handleAiGenerate} disabled={isLoading || !aiPrompt.trim()}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isLoading ? 'Genereren...' : 'Recepten genereren'}
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedCount} van {parsedRecipes.length} geselecteerd
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => selectAll(true)}>
                  Alles selecteren
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectAll(false)}>
                  Alles deselecteren
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
                        <Badge variant="outline" className="text-xs">{recipe.protein_g}g eiwit</Badge>
                      )}
                      {recipe.ingredients.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {recipe.ingredients.length} ingrediënten
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
                Terug
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={importing || selectedCount === 0}
                className="flex-1"
              >
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Check className="h-4 w-4 mr-2" />
                {selectedCount} importeren
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
