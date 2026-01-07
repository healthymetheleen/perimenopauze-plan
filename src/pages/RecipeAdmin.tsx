import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyRecipes, useDeleteRecipe, useBulkPublishRecipes, mealTypes } from '@/hooks/useRecipes';
import { useToast } from '@/hooks/use-toast';
import { Plus, ChefHat, Pencil, Trash2, Eye, EyeOff, Upload, CheckCircle } from 'lucide-react';
import { RecipeFormDialog } from '@/components/recipes/RecipeFormDialog';
import { RecipeImportDialog } from '@/components/recipes/RecipeImportDialog';

export default function RecipeAdminPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<string | null>(null);

  const { data: recipes, isLoading } = useMyRecipes();
  const deleteRecipe = useDeleteRecipe();
  const bulkPublish = useBulkPublishRecipes();

  const draftRecipes = recipes?.filter(r => !r.is_published) || [];

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Weet je zeker dat je "${title}" wilt verwijderen?`)) return;
    try {
      await deleteRecipe.mutateAsync(id);
      toast({ title: 'Recept verwijderd' });
    } catch {
      toast({ title: 'Kon recept niet verwijderen', variant: 'destructive' });
    }
  };

  const handleBulkPublish = async () => {
    if (draftRecipes.length === 0) return;
    if (!confirm(`Wil je ${draftRecipes.length} concept-recepten publiceren?`)) return;
    try {
      await bulkPublish.mutateAsync(draftRecipes.map(r => r.id));
      toast({ title: `${draftRecipes.length} recepten gepubliceerd` });
    } catch {
      toast({ title: 'Kon recepten niet publiceren', variant: 'destructive' });
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
          <div className="flex gap-2">
            {draftRecipes.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleBulkPublish}
                disabled={bulkPublish.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {bulkPublish.isPending ? 'Publiceren...' : `${draftRecipes.length} publiceren`}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importeren
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuw recept
            </Button>
          </div>
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
                        {t(mealTypes.find(m => m.value === recipe.meal_type)?.labelKey || '')}
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

      <RecipeImportDialog
        open={showImport}
        onOpenChange={setShowImport}
      />
    </AppLayout>
  );
}
