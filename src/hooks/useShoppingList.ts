import { useState, useMemo, useCallback } from 'react';
import { Recipe, Ingredient } from './useRecipes';

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

export function useShoppingList() {
  const [selectedRecipes, setSelectedRecipes] = useState<Map<string, Recipe>>(new Map());

  const addRecipe = useCallback((recipe: Recipe) => {
    setSelectedRecipes(prev => new Map(prev).set(recipe.id, recipe));
  }, []);

  const removeRecipe = useCallback((recipeId: string) => {
    setSelectedRecipes(prev => {
      const next = new Map(prev);
      next.delete(recipeId);
      return next;
    });
  }, []);

  const toggleRecipe = useCallback((recipe: Recipe) => {
    if (selectedRecipes.has(recipe.id)) {
      removeRecipe(recipe.id);
    } else {
      addRecipe(recipe);
    }
  }, [selectedRecipes, addRecipe, removeRecipe]);

  const isSelected = useCallback((recipeId: string) => {
    return selectedRecipes.has(recipeId);
  }, [selectedRecipes]);

  const clearAll = useCallback(() => {
    setSelectedRecipes(new Map());
  }, []);

  // Aggregate ingredients
  const shoppingList = useMemo(() => {
    const ingredientMap = new Map<string, ShoppingItem>();

    selectedRecipes.forEach((recipe) => {
      const ingredients = recipe.ingredients || [];
      ingredients.forEach((ing: Ingredient) => {
        const key = ing.name.toLowerCase().trim();
        
        if (!ingredientMap.has(key)) {
          ingredientMap.set(key, {
            name: ing.name,
            amounts: [],
          });
        }

        const item = ingredientMap.get(key)!;
        item.amounts.push({
          amount: ing.amount,
          unit: ing.unit,
          recipeTitle: recipe.title,
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
          totalAmount: String(Math.round(total * 100) / 100),
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
    isSelected,
    clearAll,
    shoppingList,
  };
}
