import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useRecipe,
  useCreateRecipe,
  useUpdateRecipe,
  useGenerateRecipeImage,
  mealTypes,
  seasons,
  dietTags,
  Ingredient,
} from '@/hooks/useRecipes';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Sparkles, Loader2 } from 'lucide-react';

interface RecipeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId?: string | null;
}

export function RecipeFormDialog({ open, onOpenChange, recipeId }: RecipeFormDialogProps) {
  const { toast } = useToast();
  const { data: existingRecipe } = useRecipe(recipeId || null);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const generateImage = useGenerateRecipeImage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('2');
  const [imageUrl, setImageUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [mealType, setMealType] = useState('ontbijt');
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [selectedDietTags, setSelectedDietTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: '', unit: '' },
  ]);
  const [kcal, setKcal] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [fatG, setFatG] = useState('');
  const [fiberG, setFiberG] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Load existing recipe data
  useEffect(() => {
    if (existingRecipe) {
      setTitle(existingRecipe.title);
      setDescription(existingRecipe.description || '');
      setInstructions(existingRecipe.instructions);
      setPrepTime(existingRecipe.prep_time_minutes?.toString() || '');
      setCookTime(existingRecipe.cook_time_minutes?.toString() || '');
      setServings(existingRecipe.servings?.toString() || '2');
      setImageUrl(existingRecipe.image_url || '');
      setThumbnailUrl(existingRecipe.thumbnail_url || '');
      setSelectedSeasons(existingRecipe.seasons);
      setSelectedDietTags(existingRecipe.diet_tags);
      setIngredients(existingRecipe.ingredients.length > 0 
        ? existingRecipe.ingredients 
        : [{ name: '', amount: '', unit: '' }]
      );
      setKcal(existingRecipe.kcal?.toString() || '');
      setProteinG(existingRecipe.protein_g?.toString() || '');
      setCarbsG(existingRecipe.carbs_g?.toString() || '');
      setFatG(existingRecipe.fat_g?.toString() || '');
      setFiberG(existingRecipe.fiber_g?.toString() || '');
      setIsPublished(existingRecipe.is_published);
    } else {
      // Reset form for new recipe
      setTitle('');
      setDescription('');
      setInstructions('');
      setPrepTime('');
      setCookTime('');
      setServings('2');
      setImageUrl('');
      setThumbnailUrl('');
      setMealType('ontbijt');
      setSelectedSeasons([]);
      setSelectedDietTags([]);
      setIngredients([{ name: '', amount: '', unit: '' }]);
      setKcal('');
      setProteinG('');
      setCarbsG('');
      setFatG('');
      setFiberG('');
      setIsPublished(false);
    }
  }, [existingRecipe, open]);

  const handleSeasonToggle = (season: string) => {
    setSelectedSeasons(prev =>
      prev.includes(season)
        ? prev.filter(s => s !== season)
        : [...prev, season]
    );
  };

  const handleDietTagToggle = (tag: string) => {
    setSelectedDietTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !instructions.trim()) {
      toast({ title: 'Vul titel en bereiding in', variant: 'destructive' });
      return;
    }

    const validIngredients = ingredients.filter(i => i.name.trim());

    const recipeData = {
      title: title.trim(),
      description: description.trim() || null,
      instructions: instructions.trim(),
      prep_time_minutes: prepTime ? parseInt(prepTime) : null,
      cook_time_minutes: cookTime ? parseInt(cookTime) : null,
      servings: servings ? parseInt(servings) : null,
      image_url: imageUrl.trim() || null,
      thumbnail_url: thumbnailUrl.trim() || null,
      meal_type: mealType,
      seasons: selectedSeasons,
      diet_tags: selectedDietTags,
      ingredients: validIngredients,
      kcal: kcal ? parseInt(kcal) : null,
      protein_g: proteinG ? parseFloat(proteinG) : null,
      carbs_g: carbsG ? parseFloat(carbsG) : null,
      fat_g: fatG ? parseFloat(fatG) : null,
      fiber_g: fiberG ? parseFloat(fiberG) : null,
      is_published: isPublished,
    };

    try {
      if (recipeId) {
        await updateRecipe.mutateAsync({ id: recipeId, ...recipeData });
        toast({ title: 'Recept bijgewerkt' });
      } else {
        await createRecipe.mutateAsync(recipeData);
        toast({ title: 'Recept toegevoegd' });
      }
      onOpenChange(false);
    } catch {
      toast({ title: 'Kon recept niet opslaan', variant: 'destructive' });
    }
  };

  const isPending = createRecipe.isPending || updateRecipe.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {recipeId ? 'Recept bewerken' : 'Nieuw recept'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6">
          <div className="space-y-6 py-4">
            {/* Basic info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Bijv. Overnight oats met bessen"
                />
              </div>

              <div>
                <Label htmlFor="description">Beschrijving</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Korte beschrijving van het recept"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="imageUrl">Afbeelding URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... of genereer met AI"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!title) {
                        toast({
                          title: 'Titel vereist',
                          description: 'Vul eerst een titel in om een afbeelding te genereren.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      try {
                        const result = await generateImage.mutateAsync({
                          recipeTitle: title,
                          recipeDescription: description,
                          mealType,
                        });
                        setImageUrl(result.imageUrl);
                        if (result.thumbnailUrl) {
                          setThumbnailUrl(result.thumbnailUrl);
                        }
                        toast({
                          title: 'Afbeelding gegenereerd',
                          description: 'De AI heeft een afbeelding voor dit recept gemaakt.',
                        });
                      } catch (error: any) {
                        toast({
                          title: 'Genereren mislukt',
                          description: error.message || 'Kon geen afbeelding genereren.',
                          variant: 'destructive',
                        });
                      }
                    }}
                    disabled={generateImage.isPending || !title}
                  >
                    {generateImage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {imageUrl && (
                  <div className="mt-2 relative">
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      className="h-32 w-full object-cover rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Categorization */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Moment van de dag</Label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mealTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Porties</Label>
                  <Input
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Seizoen/cyclusfase</Label>
                <div className="flex flex-wrap gap-2">
                  {seasons.map((season) => (
                    <label
                      key={season.value}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedSeasons.includes(season.value)}
                        onCheckedChange={() => handleSeasonToggle(season.value)}
                      />
                      {season.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Dieet tags</Label>
                <div className="flex flex-wrap gap-2">
                  {dietTags.map((tag) => (
                    <label
                      key={tag.value}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedDietTags.includes(tag.value)}
                        onCheckedChange={() => handleDietTagToggle(tag.value)}
                      />
                      {tag.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Voorbereidingstijd (min)</Label>
                <Input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Kooktijd (min)</Label>
                <Input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  placeholder="20"
                />
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <Label className="mb-2 block">Ingrediënten</Label>
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Hoeveelheid"
                      value={ingredient.amount}
                      onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      placeholder="Eenheid"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      placeholder="Ingrediënt"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    {ingredients.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addIngredient}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ingrediënt toevoegen
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <Label htmlFor="instructions">Bereiding *</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Beschrijf de stappen..."
                rows={6}
              />
            </div>

            {/* Nutrition */}
            <div>
              <Label className="mb-2 block">Voedingswaarde per portie (optioneel)</Label>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <Input
                    type="number"
                    placeholder="kcal"
                    value={kcal}
                    onChange={(e) => setKcal(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">kcal</span>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="eiwit"
                    value={proteinG}
                    onChange={(e) => setProteinG(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">eiwit (g)</span>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="koolh."
                    value={carbsG}
                    onChange={(e) => setCarbsG(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">koolh. (g)</span>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="vet"
                    value={fatG}
                    onChange={(e) => setFatG(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">vet (g)</span>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="vezels"
                    value={fiberG}
                    onChange={(e) => setFiberG(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">vezels (g)</span>
                </div>
              </div>
            </div>

            {/* Publish toggle */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <Switch
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
              <div>
                <p className="font-medium text-sm">Publiceren</p>
                <p className="text-xs text-muted-foreground">
                  {isPublished ? 'Zichtbaar voor alle gebruikers' : 'Alleen zichtbaar voor jou'}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Opslaan...' : recipeId ? 'Bijwerken' : 'Toevoegen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
