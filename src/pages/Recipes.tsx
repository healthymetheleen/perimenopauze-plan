import { useState } from 'react';
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
import { useRecipes, useSeasonRecipes, mealTypes, seasons, dietTags, Recipe } from '@/hooks/useRecipes';
import { useLatestPrediction, useCyclePreferences, seasonLabels } from '@/hooks/useCycle';
import { useShoppingList } from '@/hooks/useShoppingList';
import { ShoppingListSheet } from '@/components/recipes/ShoppingListSheet';
import { sanitizeImageUrl } from '@/lib/sanitize';
import { Search, Clock, Users, ChefHat, Sparkles, Filter, X, ShoppingCart } from 'lucide-react';

export default function RecipesPage() {
  const [search, setSearch] = useState('');
  const [mealType, setMealType] = useState<string>('');
  const [season, setSeason] = useState<string>('');
  const [dietTag, setDietTag] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);

  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  const currentSeason = prediction?.current_season || 'onbekend';
  const showSeasonSuggestions = preferences?.onboarding_completed && currentSeason !== 'onbekend';

  const { data: recipes, isLoading } = useRecipes({
    mealType: mealType || undefined,
    season: season || undefined,
    dietTag: dietTag || undefined,
    search: search || undefined,
  });

  const { data: seasonRecipes } = useSeasonRecipes(currentSeason);

  const {
    selectedRecipes,
    selectedCount,
    toggleRecipe,
    isSelected,
    removeRecipe,
    clearAll,
    shoppingList,
  } = useShoppingList();

  const hasFilters = mealType || season || dietTag || search;

  const clearFilters = () => {
    setMealType('');
    setSeason('');
    setDietTag('');
    setSearch('');
  };

  const handleRecipeCheckbox = (recipe: Recipe, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleRecipe(recipe);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Recepten</h1>
            <p className="text-muted-foreground">
              Gezonde recepten afgestemd op je cyclusfase
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

        {/* Season suggestions */}
        {showSeasonSuggestions && seasonRecipes && seasonRecipes.length > 0 && !hasFilters && (
          <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Aanbevolen voor {seasonLabels[currentSeason].toLowerCase()}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Recepten die passen bij je huidige cyclusfase
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {seasonRecipes.slice(0, 3).map((recipe) => (
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

        {/* Search and filters */}
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
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-3 gap-2">
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Moment" />
                </SelectTrigger>
                <SelectContent>
                  {mealTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Seizoen" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dietTag} onValueChange={setDietTag}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Dieet" />
                </SelectTrigger>
                <SelectContent>
                  {dietTags.map((tag) => (
                    <SelectItem key={tag.value} value={tag.value}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Filters wissen
            </Button>
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
            description={hasFilters ? "Probeer andere filters" : "Er zijn nog geen recepten toegevoegd"}
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
