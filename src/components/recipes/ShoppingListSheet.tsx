import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingItem, SelectedRecipe } from '@/hooks/useShoppingList';
import { ShoppingCart, Trash2, ChefHat, Copy, Check, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ShoppingListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRecipes: SelectedRecipe[];
  shoppingList: ShoppingItem[];
  onRemoveRecipe: (recipeId: string) => void;
  onUpdateServings?: (recipeId: string, servings: number) => void;
  onClearAll: () => void;
}

export function ShoppingListSheet({
  open,
  onOpenChange,
  selectedRecipes,
  shoppingList,
  onRemoveRecipe,
  onUpdateServings,
  onClearAll,
}: ShoppingListSheetProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const lines: string[] = [
      '🛒 Boodschappenlijst',
      '',
      `Recepten: ${selectedRecipes.map(r => r.title).join(', ')}`,
      '',
      '---',
      '',
    ];

    shoppingList.forEach((item) => {
      if (item.totalAmount) {
        lines.push(`☐ ${item.name}: ${item.totalAmount} ${item.unit}`);
      } else {
        const amounts = item.amounts.map(a => `${a.amount} ${a.unit}`).join(' + ');
        lines.push(`☐ ${item.name}: ${amounts}`);
      }
    });

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      toast({ title: 'Gekopieerd naar klembord!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Kopiëren mislukt', variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Boodschappenlijst
          </SheetTitle>
          <SheetDescription>
            {selectedRecipes.length} {selectedRecipes.length === 1 ? 'recept' : 'recepten'} geselecteerd
          </SheetDescription>
        </SheetHeader>

        {selectedRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Selecteer recepten om een boodschappenlijst te maken
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Selected recipes with servings control */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Geselecteerde recepten</h3>
              <div className="space-y-2">
                {selectedRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChefHat className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{recipe.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Servings control */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onUpdateServings?.(recipe.id, Math.max(1, recipe.selectedServings - 1))}
                          disabled={recipe.selectedServings <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs w-6 text-center">{recipe.selectedServings}p</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onUpdateServings?.(recipe.id, recipe.selectedServings + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-destructive/20"
                        onClick={() => onRemoveRecipe(recipe.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Shopping list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Ingrediënten ({shoppingList.length})
                </h3>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copied ? 'Gekopieerd!' : 'Kopiëren'}
                </Button>
              </div>

              <ScrollArea className="h-[40vh]">
                <div className="space-y-2 pr-4">
                  {shoppingList.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between py-2 border-b border-border/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{item.name}</p>
                        {item.totalAmount ? (
                          <p className="text-sm text-muted-foreground">
                            {item.totalAmount} {item.unit}
                          </p>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {item.amounts.map((a, i) => (
                              <span key={i}>
                                {i > 0 && ' + '}
                                {a.amount} {a.unit}
                                <span className="text-xs opacity-70"> ({a.recipeTitle})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" onClick={onClearAll} className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Lijst wissen
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
