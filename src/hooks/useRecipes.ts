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
  meal_type: string;
  seasons: string[];
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
  seasons?: string[];
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
  { value: 'ontbijt', label: 'Ontbijt' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'diner', label: 'Diner' },
  { value: 'snack', label: 'Snack' },
  { value: 'tussendoortje', label: 'Tussendoortje' },
] as const;

export const seasons = [
  { value: 'winter', label: 'Winter (menstruatie)' },
  { value: 'lente', label: 'Lente (folliculair)' },
  { value: 'zomer', label: 'Zomer (ovulatie)' },
  { value: 'herfst', label: 'Herfst (luteaal)' },
] as const;

export const dietTags = [
  { value: 'vegetarisch', label: 'Vegetarisch' },
  { value: 'veganistisch', label: 'Veganistisch' },
  { value: 'glutenvrij', label: 'Glutenvrij' },
  { value: 'zuivelvrij', label: 'Zuivelvrij' },
  { value: 'lactosevrij', label: 'Lactosevrij' },
  { value: 'keto', label: 'Keto' },
  { value: 'low-carb', label: 'Low-carb' },
  { value: 'eiwitrijk', label: 'Eiwitrijk' },
  { value: 'vezelrijk', label: 'Vezelrijk' },
  { value: 'anti-inflammatoir', label: 'Anti-inflammatoir' },
  { value: 'bloedsuikerstabiel', label: 'Bloedsuikerstabiel' },
] as const;

// Fetch all published recipes
export function useRecipes(filters?: {
  mealType?: string;
  season?: string;
  dietTag?: string;
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
      if (filters?.dietTag) {
        query = query.contains('diet_tags', [filters.dietTag]);
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
