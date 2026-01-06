import { useState, useMemo, useCallback } from 'react';
import { Recipe, Ingredient } from './useRecipes';

export interface SelectedRecipe extends Recipe {
  selectedServings: number;
}

export interface ShoppingItem {
  name: string;
  amounts: { amount: string; unit: string; recipeTitle: string }[];
  totalAmount?: string;
  unit?: string;
}

// Try to normalize and sum amounts with same unit
function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  const unitMap: Record<string, string> = {
    'g': 'gram',
    'gr': 'gram',
    'gram': 'gram',
    'grams': 'gram',
    'kg': 'kg',
    'kilogram': 'kg',
    'ml': 'ml',
    'milliliter': 'ml',
    'l': 'liter',
    'liter': 'liter',
    'el': 'el',
    'eetlepel': 'el',
    'eetlepels': 'el',
    'tl': 'tl',
    'theelepel': 'tl',
    'theelepels': 'tl',
    'stuk': 'stuk',
    'stuks': 'stuk',
    '': 'stuk',
  };
  return unitMap[lower] || lower;
}

function parseAmount(amount: string): number | null {
  const cleaned = amount.replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function formatAmount(num: number): string {
  const rounded = Math.round(num * 100) / 100;
  // Use nice fractions for common values
  if (rounded === 0.25) return '¼';
  if (rounded === 0.5) return '½';
  if (rounded === 0.75) return '¾';
  if (rounded === 0.33) return '⅓';
  if (rounded === 0.67) return '⅔';
  return String(rounded);
}

export function useShoppingList() {
  // Store recipes with their selected servings
  const [selectedRecipes, setSelectedRecipes] = useState<Map<string, SelectedRecipe>>(new Map());

  const addRecipe = useCallback((recipe: Recipe, servings?: number) => {
    const selectedServings = servings || recipe.servings || 4;
    setSelectedRecipes(prev => new Map(prev).set(recipe.id, { ...recipe, selectedServings }));
  }, []);

  const removeRecipe = useCallback((recipeId: string) => {
    setSelectedRecipes(prev => {
      const next = new Map(prev);
      next.delete(recipeId);
      return next;
    });
  }, []);

  const toggleRecipe = useCallback((recipe: Recipe, servings?: number) => {
    if (selectedRecipes.has(recipe.id)) {
      removeRecipe(recipe.id);
    } else {
      addRecipe(recipe, servings);
    }
  }, [selectedRecipes, addRecipe, removeRecipe]);

  const updateServings = useCallback((recipeId: string, newServings: number) => {
    setSelectedRecipes(prev => {
      const next = new Map(prev);
      const existing = next.get(recipeId);
      if (existing) {
        next.set(recipeId, { ...existing, selectedServings: newServings });
      }
      return next;
    });
  }, []);

  const isSelected = useCallback((recipeId: string) => {
    return selectedRecipes.has(recipeId);
  }, [selectedRecipes]);

  const getSelectedServings = useCallback((recipeId: string) => {
    return selectedRecipes.get(recipeId)?.selectedServings;
  }, [selectedRecipes]);

  const clearAll = useCallback(() => {
    setSelectedRecipes(new Map());
  }, []);

  // Aggregate ingredients with scaled amounts
  const shoppingList = useMemo(() => {
    const ingredientMap = new Map<string, ShoppingItem>();

    selectedRecipes.forEach((recipe) => {
      const ingredients = recipe.ingredients || [];
      const originalServings = recipe.servings || 4;
      const scaleFactor = recipe.selectedServings / originalServings;

      ingredients.forEach((ing: Ingredient) => {
        const key = ing.name.toLowerCase().trim();
        
        if (!ingredientMap.has(key)) {
          ingredientMap.set(key, {
            name: ing.name,
            amounts: [],
          });
        }

        // Scale the amount
        const parsedAmount = parseAmount(ing.amount);
        let scaledAmountStr = ing.amount;
        if (parsedAmount !== null) {
          scaledAmountStr = formatAmount(parsedAmount * scaleFactor);
        }

        const item = ingredientMap.get(key)!;
        item.amounts.push({
          amount: scaledAmountStr,
          unit: ing.unit,
          recipeTitle: `${recipe.title} (${recipe.selectedServings}p)`,
        });
      });
    });

    // Try to sum amounts with same units
    const result: ShoppingItem[] = [];
    
    ingredientMap.forEach((item) => {
      // Group by normalized unit
      const unitGroups = new Map<string, number>();
      const unParseable: { amount: string; unit: string; recipeTitle: string }[] = [];

      item.amounts.forEach((a) => {
        const normalizedUnit = normalizeUnit(a.unit);
        const numAmount = parseAmount(a.amount);

        if (numAmount !== null) {
          const current = unitGroups.get(normalizedUnit) || 0;
          unitGroups.set(normalizedUnit, current + numAmount);
        } else {
          unParseable.push(a);
        }
      });

      // If we have exactly one unit type and all parsed, show total
      if (unitGroups.size === 1 && unParseable.length === 0) {
        const [unit, total] = Array.from(unitGroups.entries())[0];
        result.push({
          name: item.name,
          amounts: item.amounts,
          totalAmount: formatAmount(total),
          unit,
        });
      } else {
        // Mixed units or unparseable, show all
        result.push({
          name: item.name,
          amounts: item.amounts,
        });
      }
    });

    return result.sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  }, [selectedRecipes]);

  return {
    selectedRecipes: Array.from(selectedRecipes.values()),
    selectedCount: selectedRecipes.size,
    addRecipe,
    removeRecipe,
    toggleRecipe,
    updateServings,
    isSelected,
    getSelectedServings,
    clearAll,
    shoppingList,
  };
}
