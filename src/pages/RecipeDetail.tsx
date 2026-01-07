import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { useRecipe, useFavoriteIds, useAddFavorite, useRemoveFavorite, mealTypes, dietTags, Ingredient } from '@/hooks/useRecipes';
import { useShoppingList } from '@/hooks/useShoppingList';
import { sanitizeImageUrl } from '@/lib/sanitize';
import { useAuth } from '@/lib/auth';
import { ArrowLeft, Clock, Users, ChefHat, Flame, Beef, Wheat, Droplet, Minus, Plus, ShoppingCart, Check, Heart } from 'lucide-react';

// Scale ingredient amount based on servings
function scaleIngredient(ingredient: Ingredient, originalServings: number, newServings: number): { amount: string; unit: string; name: string } {
  const scaleFactor = newServings / originalServings;
  const parsed = parseFloat(ingredient.amount.replace(',', '.'));
  
  if (isNaN(parsed)) {
    return ingredient;
  }
  
  const scaled = parsed * scaleFactor;
  const rounded = Math.round(scaled * 100) / 100;
  
  // Use nice fractions
  let amountStr: string;
  if (rounded === 0.25) amountStr = '¼';
  else if (rounded === 0.5) amountStr = '½';
  else if (rounded === 0.75) amountStr = '¾';
  else if (rounded === 0.33) amountStr = '⅓';
  else if (rounded === 0.67) amountStr = '⅔';
  else amountStr = String(rounded);
  
  return { ...ingredient, amount: amountStr };
}

export default function RecipeDetailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading } = useRecipe(id || null);
  const { isSelected, toggleRecipe, getSelectedServings } = useShoppingList();
  
  // Favorites
  const { data: favoriteIds = [] } = useFavoriteIds();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const isFavorite = id ? favoriteIds.includes(id) : false;
  
  const handleToggleFavorite = () => {
    if (!user || !id) return;
    if (isFavorite) {
      removeFavorite.mutate(id);
    } else {
      addFavorite.mutate(id);
    }
  };
  
  // Local serving size state
  const [localServings, setLocalServings] = useState<number | null>(null);
  
  // Use local servings, or shopping list servings if selected, or recipe default
  const effectiveServings = localServings ?? getSelectedServings(id || '') ?? recipe?.servings ?? 4;
  const originalServings = recipe?.servings || 4;
  
  // Scale ingredients based on servings
  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return recipe.ingredients.map(ing => scaleIngredient(ing, originalServings, effectiveServings));
  }, [recipe, originalServings, effectiveServings]);
  
  // Scale nutrition values
  const scaledNutrition = useMemo(() => {
    if (!recipe) return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
    const scaleFactor = effectiveServings / originalServings;
    return {
      kcal: recipe.kcal ? Math.round(recipe.kcal * scaleFactor) : null,
      protein_g: recipe.protein_g ? Math.round(recipe.protein_g * scaleFactor) : null,
      carbs_g: recipe.carbs_g ? Math.round(recipe.carbs_g * scaleFactor) : null,
      fat_g: recipe.fat_g ? Math.round(recipe.fat_g * scaleFactor) : null,
      fiber_g: recipe.fiber_g ? Math.round(recipe.fiber_g * scaleFactor) : null,
    };
  }, [recipe, originalServings, effectiveServings]);

  const handleServingsChange = (delta: number) => {
    const newServings = Math.max(1, effectiveServings + delta);
    setLocalServings(newServings);
  };

  const handleAddToShoppingList = () => {
    if (recipe) {
      toggleRecipe(recipe, effectiveServings);
    }
  };

  const recipeIsSelected = id ? isSelected(id) : false;

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingState message="Recept laden..." />
      </AppLayout>
    );
  }

  if (!recipe) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-semibold mb-2">Recept niet gevonden</h1>
          <Button asChild variant="outline">
            <Link to="/recepten">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar recepten
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back button */}
        <Button asChild variant="ghost" size="sm">
          <Link to="/recepten">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug
          </Link>
        </Button>

        {/* Header with image */}
        {sanitizeImageUrl(recipe.image_url) && (
          <div className="aspect-video rounded-2xl overflow-hidden">
            <img
              src={sanitizeImageUrl(recipe.image_url)}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title and meta */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold">{recipe.title}</h1>
            {user && (
              <button
                onClick={handleToggleFavorite}
                className="p-2 hover:scale-110 transition-transform flex-shrink-0"
                aria-label={isFavorite ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
              >
                <Heart 
                  className={`h-6 w-6 transition-colors ${
                    isFavorite 
                      ? 'fill-primary text-primary' 
                      : 'text-muted-foreground hover:text-primary/70'
                  }`} 
                />
              </button>
            )}
          </div>
          {recipe.description && (
            <p className="text-muted-foreground mt-2">{recipe.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Badge>
              {t(mealTypes.find(m => m.value === recipe.meal_type)?.labelKey || '')}
            </Badge>
            {totalTime > 0 && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {totalTime} min
              </span>
            )}
          </div>
        </div>

        {/* Diet tags only - removed seasons and cycle phases */}
        {(() => {
          // Prioritize important diet tags, limit display
          const priorityTags = ['vegetarisch', 'veganistisch', 'pescotarisch', 'glutenvrij', 'zuivelvrij', 'lactosevrij', 'eivrij', 'notenvrij', 'zwangerschapsveilig', 'kinderwensvriendelijk'];
          const sortedDietTags = [...recipe.diet_tags].sort((a, b) => {
            const aIdx = priorityTags.indexOf(a);
            const bIdx = priorityTags.indexOf(b);
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          });
          const displayDietTags = sortedDietTags.slice(0, 6); // Max 6 tags
          const hasMoreTags = sortedDietTags.length > 6;

          if (displayDietTags.length === 0) return null;

          return (
            <div className="flex flex-wrap gap-2">
              {displayDietTags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {dietTags.find(t => t.value === tag)?.label || tag}
                </Badge>
              ))}
              {hasMoreTags && (
                <Badge variant="outline" className="text-muted-foreground">
                  +{sortedDietTags.length - 6} meer
                </Badge>
              )}
            </div>
          );
        })()}

        {/* Servings selector */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Aantal personen</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleServingsChange(-1)}
                  disabled={effectiveServings <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-8 text-center">{effectiveServings}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleServingsChange(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {effectiveServings !== originalServings && (
              <p className="text-xs text-muted-foreground mt-2">
                Origineel recept: {originalServings} personen
              </p>
            )}
          </CardContent>
        </Card>

        {/* Add to shopping list button */}
        <Button
          onClick={handleAddToShoppingList}
          variant={recipeIsSelected ? 'secondary' : 'default'}
          className="w-full"
        >
          {recipeIsSelected ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Toegevoegd aan boodschappenlijst
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Toevoegen aan boodschappenlijst ({effectiveServings}p)
            </>
          )}
        </Button>

        {/* Nutrition info */}
        {(scaledNutrition.kcal || scaledNutrition.protein_g || scaledNutrition.carbs_g || scaledNutrition.fat_g) && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Voedingswaarde totaal ({effectiveServings} {effectiveServings === 1 ? 'portie' : 'porties'})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                {scaledNutrition.kcal && (
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Flame className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-lg font-semibold">{scaledNutrition.kcal}</p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                )}
                {scaledNutrition.protein_g && (
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Beef className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-lg font-semibold">{scaledNutrition.protein_g}g</p>
                    <p className="text-xs text-muted-foreground">eiwit</p>
                  </div>
                )}
                {scaledNutrition.carbs_g && (
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Wheat className="h-4 w-4 text-foreground" />
                    </div>
                    <p className="text-lg font-semibold">{scaledNutrition.carbs_g}g</p>
                    <p className="text-xs text-muted-foreground">koolh.</p>
                  </div>
                )}
                {scaledNutrition.fat_g && (
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Droplet className="h-4 w-4 text-foreground" />
                    </div>
                    <p className="text-lg font-semibold">{scaledNutrition.fat_g}g</p>
                    <p className="text-xs text-muted-foreground">vet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ingredients */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Ingrediënten</CardTitle>
            <p className="text-sm text-muted-foreground">
              Voor {effectiveServings} {effectiveServings === 1 ? 'persoon' : 'personen'}
              {effectiveServings !== originalServings && (
                <span className="text-primary"> (aangepast)</span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {scaledIngredients.map((ingredient, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <span>
                    {ingredient.amount} {ingredient.unit} {ingredient.name}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Bereiding</CardTitle>
            {recipe.prep_time_minutes && recipe.cook_time_minutes && (
              <p className="text-sm text-muted-foreground">
                {recipe.prep_time_minutes} min voorbereiden • {recipe.cook_time_minutes} min koken
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {recipe.instructions.split('\n').map((step, index) => (
                <p key={index} className="mb-3">
                  {step}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
