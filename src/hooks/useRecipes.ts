import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Json } from '@/integrations/supabase/types';

export interface Recipe {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  instructions: string;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  image_url: string | null;
  thumbnail_url: string | null;
  meal_type: string;
  seasons: string[];
  cycle_phases: string[];
  diet_tags: string[];
  ingredients: Ingredient[];
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export type RecipeInsert = {
  title: string;
  instructions: string;
  meal_type: string;
  description?: string | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  servings?: number | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  seasons?: string[];
  cycle_phases?: string[];
  diet_tags?: string[];
  ingredients?: Ingredient[];
  kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  is_published?: boolean;
};

export type RecipeUpdate = Partial<RecipeInsert>;

export const mealTypes = [
  { value: 'ontbijt', labelKey: 'recipes.meal_ontbijt' },
  { value: 'lunch', labelKey: 'recipes.meal_lunch' },
  { value: 'diner', labelKey: 'recipes.meal_diner' },
  { value: 'snack', labelKey: 'recipes.meal_snack' },
  { value: 'tussendoortje', labelKey: 'recipes.meal_tussendoortje' },
  { value: 'drankje', labelKey: 'recipes.meal_drankje' },
  { value: 'smoothie', labelKey: 'recipes.meal_smoothie' },
] as const;

// Weather/calendar seasons
export const seasons = [
  { value: 'lente', label: 'Lente' },
  { value: 'zomer', label: 'Zomer' },
  { value: 'herfst', label: 'Herfst' },
  { value: 'winter', label: 'Winter' },
] as const;

// Menstrual cycle phases
export const cyclePhases = [
  { value: 'menstruatie', label: 'Menstruatie', description: 'Rustfase, ijzerrijk' },
  { value: 'folliculair', label: 'Folliculair', description: 'Energie opbouwen' },
  { value: 'ovulatie', label: 'Ovulatie', description: 'Piek energie' },
  { value: 'luteaal', label: 'Luteaal', description: 'Comfort, magnesium' },
] as const;

export const dietTags = [
  { value: 'vegetarisch', label: 'Vegetarisch' },
  { value: 'veganistisch', label: 'Veganistisch' },
  { value: 'pescotarisch', label: 'Pescotarisch' },
  { value: 'glutenvrij', label: 'Glutenvrij' },
  { value: 'zuivelvrij', label: 'Zuivelvrij' },
  { value: 'lactosevrij', label: 'Lactosevrij' },
  { value: 'eivrij', label: 'Eivrij' },
  { value: 'notenvrij', label: 'Notenvrij' },
  { value: 'sojavrij', label: 'Sojavrij' },
  { value: 'keto', label: 'Keto' },
  { value: 'low-carb', label: 'Low-carb' },
  { value: 'eiwitrijk', label: 'Eiwitrijk' },
  { value: 'vezelrijk', label: 'Vezelrijk' },
  { value: 'anti-inflammatoir', label: 'Anti-inflammatoir' },
  { value: 'bloedsuikerstabiel', label: 'Bloedsuikerstabiel' },
  { value: 'zwangerschapsveilig', label: 'Zwangerschapsveilig' },
  { value: 'kinderwensvriendelijk', label: 'Kinderwensvriendelijk' },
  { value: 'ijzerrijk', label: 'IJzerrijk' },
  { value: 'foliumzuurrijk', label: 'Foliumzuurrijk' },
] as const;

// Fetch all published recipes
export function useRecipes(filters?: {
  mealType?: string;
  season?: string;
  cyclePhase?: string;
  dietTags?: string[];
  search?: string;
}) {
  return useQuery({
    queryKey: ['recipes', filters],
    queryFn: async () => {
      let query = supabase
        .from('recipes')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (filters?.mealType) {
        query = query.eq('meal_type', filters.mealType);
      }
      if (filters?.season) {
        query = query.contains('seasons', [filters.season]);
      }
      if (filters?.cyclePhase) {
        query = query.contains('cycle_phases', [filters.cyclePhase]);
      }
      if (filters?.dietTags && filters.dietTags.length > 0) {
        // Filter recipes that contain ALL selected diet tags
        for (const tag of filters.dietTags) {
          query = query.contains('diet_tags', [tag]);
        }
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Recipe[];
    },
  });
}

// Fetch single recipe
export function useRecipe(id: string | null) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as Recipe;
    },
    enabled: !!id,
  });
}

// Fetch my recipes (for admin)
export function useMyRecipes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-recipes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Recipe[];
    },
    enabled: !!user,
  });
}

// Create recipe
export function useCreateRecipe() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (recipe: RecipeInsert) => {
      if (!user) throw new Error('Niet ingelogd');
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          ...recipe,
          owner_id: user.id,
          ingredients: (recipe.ingredients || []) as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
    },
  });
}

// Update recipe
export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: RecipeUpdate & { id: string }) => {
      const updateData = {
        ...updates,
        ingredients: updates.ingredients ? (updates.ingredients as unknown as Json) : undefined,
      };
      const { data, error } = await supabase
        .from('recipes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', variables.id] });
    },
  });
}

// Delete recipe
export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
    },
  });
}

// Bulk publish recipes
export function useBulkPublishRecipes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user) throw new Error('Niet ingelogd');
      const { error } = await supabase
        .from('recipes')
        .update({ is_published: true })
        .in('id', ids)
        .eq('owner_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
    },
  });
}

// Get season-based suggestions
export function useSeasonRecipes(currentSeason: string) {
  return useQuery({
    queryKey: ['season-recipes', currentSeason],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_published', true)
        .contains('seasons', [currentSeason])
        .limit(6);
      if (error) throw error;
      return data as unknown as Recipe[];
    },
    enabled: !!currentSeason && currentSeason !== 'onbekend',
  });
}

// Get cycle phase-based suggestions
export function useCyclePhaseRecipes(cyclePhase: string) {
  return useQuery({
    queryKey: ['cycle-phase-recipes', cyclePhase],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_published', true)
        .contains('cycle_phases', [cyclePhase])
        .limit(6);
      if (error) throw error;
      return data as unknown as Recipe[];
    },
    enabled: !!cyclePhase,
  });
}

// ============ FAVORITES ============

// Fetch user's favorite recipe IDs
export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['recipe-favorite-ids', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('recipe_favorites')
        .select('recipe_id')
        .eq('owner_id', user.id);
      if (error) throw error;
      return data.map(f => f.recipe_id);
    },
    enabled: !!user,
  });
}

// Fetch full favorite recipes
export function useFavoriteRecipes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favorite-recipes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: favorites, error: favError } = await supabase
        .from('recipe_favorites')
        .select('recipe_id')
        .eq('owner_id', user.id);
      if (favError) throw favError;
      
      if (favorites.length === 0) return [];
      
      const recipeIds = favorites.map(f => f.recipe_id);
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds)
        .eq('is_published', true);
      if (error) throw error;
      return data as unknown as Recipe[];
    },
    enabled: !!user,
  });
}

// Add recipe to favorites
export function useAddFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      if (!user) throw new Error('Niet ingelogd');
      const { error } = await supabase
        .from('recipe_favorites')
        .insert({ owner_id: user.id, recipe_id: recipeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-favorite-ids'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-recipes'] });
    },
  });
}

// Remove recipe from favorites
export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      if (!user) throw new Error('Niet ingelogd');
      const { error } = await supabase
        .from('recipe_favorites')
        .delete()
        .eq('owner_id', user.id)
        .eq('recipe_id', recipeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-favorite-ids'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-recipes'] });
    },
  });
}

// Generate recipe image with AI
export function useGenerateRecipeImage() {
  return useMutation({
    mutationFn: async ({ 
      recipeTitle, 
      recipeDescription, 
      mealType 
    }: { 
      recipeTitle: string; 
      recipeDescription?: string; 
      mealType?: string; 
    }): Promise<{ imageUrl: string; thumbnailUrl: string | null }> => {
      const { data, error } = await supabase.functions.invoke('generate-recipe-image', {
        body: { recipeTitle, recipeDescription, mealType },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return {
        imageUrl: data.imageUrl as string,
        thumbnailUrl: data.thumbnailUrl as string | null,
      };
    },
  });
}
