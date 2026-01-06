import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useRecipes, useCyclePhaseRecipes, mealTypes, dietTags, Recipe } from '@/hooks/useRecipes';
import { useRecipePreferences } from '@/hooks/useRecipePreferences';
import { useLatestPrediction, useCyclePreferences, seasonLabels } from '@/hooks/useCycle';
import { useShoppingList } from '@/hooks/useShoppingList';
import { ShoppingListSheet } from '@/components/recipes/ShoppingListSheet';
import { RecipeFilters } from '@/components/recipes/RecipeFilters';
import { sanitizeImageUrl } from '@/lib/sanitize';
import { Search, Clock, Users, ChefHat, Sparkles, Filter, ShoppingCart } from 'lucide-react';

// Map cycle seasons to cycle phases
const seasonToCyclePhase: Record<string, string> = {
  winter: 'menstruatie',
  lente: 'folliculair',
  zomer: 'ovulatie',
  herfst: 'luteaal',
};

// Get current calendar season based on month
function getCurrentCalendarSeason(): string {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'lente';
  if (month >= 5 && month <= 7) return 'zomer';
  if (month >= 8 && month <= 10) return 'herfst';
  return 'winter';
}

export default function RecipesPage() {
  const [search, setSearch] = useState('');
  const [mealType, setMealType] = useState<string>('');
  const [selectedDietTags, setSelectedDietTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);

  // Persisted preferences
  const {
    autoSeasonEnabled,
    setAutoSeasonEnabled,
    autoCycleEnabled,
    setAutoCycleEnabled,
    savedAllergyTags,
    toggleAllergyTag,
  } = useRecipePreferences();

  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  
  // Current season from calendar
  const currentCalendarSeason = getCurrentCalendarSeason();
  
  // Current cycle phase from prediction
  const currentCycleSeason = prediction?.current_season || 'onbekend';
  const currentCyclePhase = seasonToCyclePhase[currentCycleSeason] || '';
  const hasCycleData = preferences?.onboarding_completed && currentCyclePhase;

  // Compute effective filters based on toggles
  const effectiveSeason = autoSeasonEnabled ? currentCalendarSeason : undefined;
  const effectiveCyclePhase = (autoCycleEnabled && hasCycleData) ? currentCyclePhase : undefined;
  
  // Combine saved allergy tags with selected diet tags
  const allDietTags = useMemo(() => {
    const combined = new Set([...savedAllergyTags, ...selectedDietTags]);
    return Array.from(combined);
  }, [savedAllergyTags, selectedDietTags]);

  const { data: recipes, isLoading } = useRecipes({
    mealType: mealType || undefined,
    season: effectiveSeason,
    cyclePhase: effectiveCyclePhase,
    dietTags: allDietTags.length > 0 ? allDietTags : undefined,
    search: search || undefined,
  });

  const { data: cycleRecipes } = useCyclePhaseRecipes(currentCyclePhase);

  const {
    selectedRecipes,
    selectedCount,
    toggleRecipe,
    isSelected,
    removeRecipe,
    clearAll,
    shoppingList,
  } = useShoppingList();

  const hasManualFilters = mealType || selectedDietTags.length > 0 || search;
  const activeFilterCount = [
    mealType ? 1 : 0,
    savedAllergyTags.length,
    selectedDietTags.length,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setMealType('');
    setSelectedDietTags([]);
    setSearch('');
  };

  // Show suggestions only when no manual filters are active
  const showCycleSuggestions = hasCycleData && cycleRecipes && cycleRecipes.length > 0 && !hasManualFilters && !showFilters;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Recepten</h1>
            <p className="text-muted-foreground">
              Gezonde recepten afgestemd op seizoen & cyclus
            </p>
          </div>
          <Button
            variant={selectedCount > 0 ? 'default' : 'outline'}
            onClick={() => setShowShoppingList(true)}
            className="relative"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Boodschappen
            {selectedCount > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {selectedCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Cycle phase suggestions */}
        {showCycleSuggestions && (
          <Card className="rounded-2xl bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Aanbevolen voor {seasonLabels[currentCycleSeason]?.toLowerCase() || currentCyclePhase}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Recepten die passen bij je huidige cyclusfase ({currentCyclePhase})
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {cycleRecipes.slice(0, 3).map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background hover:bg-muted transition-colors"
                  >
                    <Checkbox
                      checked={isSelected(recipe.id)}
                      onCheckedChange={() => toggleRecipe(recipe)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    />
                    <Link
                      to={`/recepten/${recipe.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      {sanitizeImageUrl(recipe.image_url) ? (
                        <img
                          src={sanitizeImageUrl(recipe.image_url)}
                          alt={recipe.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <ChefHat className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{recipe.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {recipe.prep_time_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {recipe.prep_time_minutes + (recipe.cook_time_minutes || 0)} min
                            </span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {mealTypes.find(m => m.value === recipe.meal_type)?.label}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and filter toggle */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek recepten..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Collapsible filter panel */}
          {showFilters && (
            <Card className="rounded-xl">
              <CardContent className="p-3">
                <RecipeFilters
                  autoSeasonEnabled={autoSeasonEnabled}
                  setAutoSeasonEnabled={setAutoSeasonEnabled}
                  autoCycleEnabled={autoCycleEnabled}
                  setAutoCycleEnabled={setAutoCycleEnabled}
                  currentSeason={currentCalendarSeason}
                  currentCyclePhase={hasCycleData ? currentCyclePhase : ''}
                  mealType={mealType}
                  setMealType={setMealType}
                  savedAllergyTags={savedAllergyTags}
                  toggleAllergyTag={toggleAllergyTag}
                  selectedDietTags={selectedDietTags}
                  setSelectedDietTags={setSelectedDietTags}
                  onClear={clearFilters}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recipe list */}
        {isLoading ? (
          <LoadingState message="Recepten laden..." />
        ) : recipes && recipes.length > 0 ? (
          <div className="grid gap-4">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex items-center">
                      <Checkbox
                        checked={isSelected(recipe.id)}
                        onCheckedChange={() => toggleRecipe(recipe)}
                        className="flex-shrink-0"
                      />
                    </div>
                    <Link to={`/recepten/${recipe.id}`} className="flex gap-4 flex-1 min-w-0">
                      {sanitizeImageUrl(recipe.image_url) ? (
                        <img
                          src={sanitizeImageUrl(recipe.image_url)}
                          alt={recipe.title}
                          className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <ChefHat className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{recipe.title}</h3>
                        {recipe.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {recipe.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="secondary">
                            {mealTypes.find(m => m.value === recipe.meal_type)?.label}
                          </Badge>
                          {recipe.prep_time_minutes && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {recipe.prep_time_minutes + (recipe.cook_time_minutes || 0)} min
                            </span>
                          )}
                          {recipe.servings && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {recipe.servings} pers.
                            </span>
                          )}
                        </div>
                        {recipe.diet_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {recipe.diet_tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {dietTags.find(t => t.value === tag)?.label || tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ChefHat className="h-12 w-12" />}
            title="Geen recepten gevonden"
            description={hasManualFilters ? "Probeer andere filters" : "Er zijn nog geen recepten toegevoegd"}
          />
        )}
      </div>

      <ShoppingListSheet
        open={showShoppingList}
        onOpenChange={setShowShoppingList}
        selectedRecipes={selectedRecipes}
        shoppingList={shoppingList}
        onRemoveRecipe={removeRecipe}
        onClearAll={clearAll}
      />
    </AppLayout>
  );
}
