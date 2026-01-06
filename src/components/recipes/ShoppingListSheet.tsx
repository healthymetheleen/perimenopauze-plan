import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingItem, useShoppingList } from '@/hooks/useShoppingList';
import { Recipe } from '@/hooks/useRecipes';
import { ShoppingCart, Trash2, ChefHat, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ShoppingListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRecipes: Recipe[];
  shoppingList: ShoppingItem[];
  onRemoveRecipe: (recipeId: string) => void;
  onClearAll: () => void;
}

export function ShoppingListSheet({
  open,
  onOpenChange,
  selectedRecipes,
  shoppingList,
  onRemoveRecipe,
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
            {/* Selected recipes */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Geselecteerde recepten</h3>
              <div className="flex flex-wrap gap-2">
                {selectedRecipes.map((recipe) => (
                  <Badge
                    key={recipe.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <ChefHat className="h-3 w-3" />
                    {recipe.title}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-destructive/20"
                      onClick={() => onRemoveRecipe(recipe.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
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
