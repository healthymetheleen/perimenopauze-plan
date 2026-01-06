import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useRecipes, useCyclePhaseRecipes, useFavoriteIds, useFavoriteRecipes, useAddFavorite, useRemoveFavorite, mealTypes, dietTags, Recipe } from '@/hooks/useRecipes';
import { useRecipePreferences } from '@/hooks/useRecipePreferences';
import { useLatestPrediction, useCyclePreferences, seasonLabels } from '@/hooks/useCycle';
import { useShoppingList } from '@/hooks/useShoppingList';
import { ShoppingListSheet } from '@/components/recipes/ShoppingListSheet';
import { RecipeFilters } from '@/components/recipes/RecipeFilters';
import { sanitizeImageUrl } from '@/lib/sanitize';
import { Search, Clock, Users, ChefHat, Sparkles, Filter, ShoppingCart, Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth';

// Time categories for filtering
const timeCategories = [
  { value: 'supersnel', label: 'Supersnel (<15 min)', maxMinutes: 15 },
  { value: 'snel', label: 'Snel (<30 min)', maxMinutes: 30 },
  { value: 'normaal', label: 'Normaal (<60 min)', maxMinutes: 60 },
  { value: 'uitgebreid', label: 'Uitgebreid (60+ min)', maxMinutes: Infinity },
] as const;

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
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [mealType, setMealType] = useState<string>('');
  const [timeCategory, setTimeCategory] = useState<string>('');
  const [selectedDietTags, setSelectedDietTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
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
  // Filter out "all" values for API
  const effectiveMealType = mealType && mealType !== 'all' ? mealType : undefined;

  const { data: allRecipes, isLoading } = useRecipes({
    mealType: effectiveMealType,
    season: effectiveSeason,
    cyclePhase: effectiveCyclePhase,
    dietTags: allDietTags.length > 0 ? allDietTags : undefined,
    search: search || undefined,
  });

  // Client-side filter for time category
  const recipes = useMemo(() => {
    if (!allRecipes) return [];
    if (!timeCategory || timeCategory === 'all') return allRecipes;
    
    const category = timeCategories.find(c => c.value === timeCategory);
    if (!category) return allRecipes;
    
    const prevCategory = timeCategories[timeCategories.findIndex(c => c.value === timeCategory) - 1];
    const minMinutes = prevCategory?.maxMinutes || 0;
    
    return allRecipes.filter(recipe => {
      const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
      return totalTime > minMinutes && totalTime <= category.maxMinutes;
    });
  }, [allRecipes, timeCategory]);

  const { data: cycleRecipes } = useCyclePhaseRecipes(currentCyclePhase);

  // Favorites
  const { data: favoriteIds = [] } = useFavoriteIds();
  const { data: favoriteRecipes = [], isLoading: favoritesLoading } = useFavoriteRecipes();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const isFavorite = (recipeId: string) => favoriteIds.includes(recipeId);
  
  const toggleFavorite = (recipeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (isFavorite(recipeId)) {
      removeFavorite.mutate(recipeId);
    } else {
      addFavorite.mutate(recipeId);
    }
  };

  // Use favorites or regular recipes based on toggle
  const displayRecipes = showFavoritesOnly ? favoriteRecipes : recipes;

  const {
    selectedRecipes,
    selectedCount,
    toggleRecipe,
    isSelected,
    removeRecipe,
    updateServings,
    clearAll,
    shoppingList,
  } = useShoppingList();

  const hasManualFilters = mealType || timeCategory || selectedDietTags.length > 0 || search;
  const activeFilterCount = [
    mealType ? 1 : 0,
    timeCategory ? 1 : 0,
    savedAllergyTags.length,
    selectedDietTags.length,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setMealType('');
    setTimeCategory('');
    setSelectedDietTags([]);
    setSearch('');
  };

  // Show suggestions only when no manual filters are active and not showing favorites
  const showCycleSuggestions = hasCycleData && cycleRecipes && cycleRecipes.length > 0 && !hasManualFilters && !showFilters && !showFavoritesOnly;

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
          <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
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

        {/* Quick filters and search */}
        <div className="space-y-3">
          {/* Quick dropdowns row */}
          <div className="flex gap-2 flex-wrap items-center">
            {/* Favorites toggle */}
            {user && (
              <Button
                variant={showFavoritesOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="gap-1"
              >
                <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                Favorieten
                {favoriteIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {favoriteIds.length}
                  </Badge>
                )}
              </Button>
            )}

            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Maaltijd" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">Alle maaltijden</SelectItem>
                {mealTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeCategory} onValueChange={setTimeCategory}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Tijd" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">Alle tijden</SelectItem>
                {timeCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(mealType || timeCategory) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setMealType(''); setTimeCategory(''); }}
                className="text-muted-foreground"
              >
                Wissen
              </Button>
            )}
          </div>

          {/* Search and advanced filters */}
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
              Meer
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
        {(showFavoritesOnly ? favoritesLoading : isLoading) ? (
          <LoadingState message={showFavoritesOnly ? "Favorieten laden..." : "Recepten laden..."} />
        ) : displayRecipes && displayRecipes.length > 0 ? (
          <div className="grid gap-4">
            {displayRecipes.map((recipe) => (
              <Card key={recipe.id} className="rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected(recipe.id)}
                        onCheckedChange={() => toggleRecipe(recipe)}
                        className="flex-shrink-0"
                      />
                      {user && (
                        <button
                          onClick={(e) => toggleFavorite(recipe.id, e)}
                          className="p-1 hover:scale-110 transition-transform"
                          aria-label={isFavorite(recipe.id) ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
                        >
                          <Heart 
                            className={`h-5 w-5 transition-colors ${
                              isFavorite(recipe.id) 
                                ? 'fill-primary text-primary' 
                                : 'text-muted-foreground hover:text-primary/70'
                            }`} 
                          />
                        </button>
                      )}
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
            icon={showFavoritesOnly ? <Heart className="h-12 w-12" /> : <ChefHat className="h-12 w-12" />}
            title={showFavoritesOnly ? "Nog geen favorieten" : "Geen recepten gevonden"}
            description={showFavoritesOnly ? "Klik op het hartje bij een recept om het toe te voegen" : (hasManualFilters ? "Probeer andere filters" : "Er zijn nog geen recepten toegevoegd")}
          />
        )}
      </div>

      <ShoppingListSheet
        open={showShoppingList}
        onOpenChange={setShowShoppingList}
        selectedRecipes={selectedRecipes}
        shoppingList={shoppingList}
        onRemoveRecipe={removeRecipe}
        onUpdateServings={updateServings}
        onClearAll={clearAll}
      />
    </AppLayout>
  );
}
