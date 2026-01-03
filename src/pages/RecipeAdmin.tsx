import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyRecipes, useDeleteRecipe, mealTypes } from '@/hooks/useRecipes';
import { useToast } from '@/hooks/use-toast';
import { Plus, ChefHat, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { RecipeFormDialog } from '@/components/recipes/RecipeFormDialog';

export default function RecipeAdminPage() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<string | null>(null);

  const { data: recipes, isLoading } = useMyRecipes();
  const deleteRecipe = useDeleteRecipe();

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Weet je zeker dat je "${title}" wilt verwijderen?`)) return;
    try {
      await deleteRecipe.mutateAsync(id);
      toast({ title: 'Recept verwijderd' });
    } catch {
      toast({ title: 'Kon recept niet verwijderen', variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Mijn recepten</h1>
            <p className="text-muted-foreground">
              Beheer je recepten
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuw recept
          </Button>
        </div>

        {/* Recipe list */}
        {isLoading ? (
          <LoadingState message="Recepten laden..." />
        ) : recipes && recipes.length > 0 ? (
          <div className="space-y-3">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <ChefHat className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{recipe.title}</h3>
                        {recipe.is_published ? (
                          <Badge variant="default" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            Gepubliceerd
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Concept
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {mealTypes.find(m => m.value === recipe.meal_type)?.label}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setEditingRecipe(recipe.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(recipe.id, recipe.title)}
                        disabled={deleteRecipe.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ChefHat className="h-12 w-12" />}
            title="Nog geen recepten"
            description="Voeg je eerste recept toe"
            action={{
              label: 'Recept toevoegen',
              onClick: () => setShowForm(true),
            }}
          />
        )}
      </div>

      <RecipeFormDialog
        open={showForm || !!editingRecipe}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditingRecipe(null);
          }
        }}
        recipeId={editingRecipe}
      />
    </AppLayout>
  );
}
