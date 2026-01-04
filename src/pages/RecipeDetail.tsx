import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { useRecipe, mealTypes, seasons, dietTags } from '@/hooks/useRecipes';
import { sanitizeImageUrl } from '@/lib/sanitize';
import { ArrowLeft, Clock, Users, ChefHat, Flame, Beef, Wheat, Droplet } from 'lucide-react';
export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading } = useRecipe(id || null);

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
          <h1 className="text-2xl font-bold">{recipe.title}</h1>
          {recipe.description && (
            <p className="text-muted-foreground mt-2">{recipe.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Badge>
              {mealTypes.find(m => m.value === recipe.meal_type)?.label}
            </Badge>
            {totalTime > 0 && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {totalTime} min
              </span>
            )}
            {recipe.servings && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                {recipe.servings} personen
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {(recipe.seasons.length > 0 || recipe.diet_tags.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {recipe.seasons.map((s) => (
              <Badge key={s} variant="secondary">
                {seasons.find(season => season.value === s)?.label || s}
              </Badge>
            ))}
            {recipe.diet_tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {dietTags.find(t => t.value === tag)?.label || tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Nutrition info */}
        {(recipe.kcal || recipe.protein_g || recipe.carbs_g || recipe.fat_g) && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Voedingswaarde per portie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                {recipe.kcal && (
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                    </div>
                    <p className="text-lg font-semibold">{recipe.kcal}</p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                )}
                {recipe.protein_g && (
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Beef className="h-4 w-4 text-red-500" />
                    </div>
                    <p className="text-lg font-semibold">{Math.round(recipe.protein_g)}g</p>
                    <p className="text-xs text-muted-foreground">eiwit</p>
                  </div>
                )}
                {recipe.carbs_g && (
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Wheat className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="text-lg font-semibold">{Math.round(recipe.carbs_g)}g</p>
                    <p className="text-xs text-muted-foreground">koolh.</p>
                  </div>
                )}
                {recipe.fat_g && (
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Droplet className="h-4 w-4 text-yellow-500" />
                    </div>
                    <p className="text-lg font-semibold">{Math.round(recipe.fat_g)}g</p>
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
            {recipe.servings && (
              <p className="text-sm text-muted-foreground">
                Voor {recipe.servings} personen
              </p>
            )}
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
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
