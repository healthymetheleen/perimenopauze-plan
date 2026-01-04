import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types for meditations and exercises
export interface Meditation {
  id: string;
  title: string;
  description: string | null;
  duration: string;
  category: 'sleep' | 'stress' | 'energy' | 'cycle';
  image_url: string | null;
  audio_url: string | null;
  cycle_season: 'winter' | 'lente' | 'zomer' | 'herfst' | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  name_dutch: string;
  description: string | null;
  duration: string;
  benefits: string[];
  image_url: string | null;
  video_url: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  cycle_phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MeditationInsert = Omit<Meditation, 'id' | 'created_at' | 'updated_at'>;
export type ExerciseInsert = Omit<Exercise, 'id' | 'created_at' | 'updated_at'>;

// Fetch all meditations
export function useMeditations(category?: string) {
  return useQuery({
    queryKey: ['meditations', category],
    queryFn: async () => {
      let query = supabase
        .from('meditations')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Meditation[];
    },
  });
}

// Fetch all meditations for admin (including inactive)
export function useAdminMeditations() {
  return useQuery({
    queryKey: ['admin-meditations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meditations')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Meditation[];
    },
  });
}

// Fetch all exercises
export function useExercises(phase?: string) {
  return useQuery({
    queryKey: ['exercises', phase],
    queryFn: async () => {
      let query = supabase
        .from('exercises')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (phase) {
        query = query.eq('cycle_phase', phase);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Exercise[];
    },
  });
}

// Fetch all exercises for admin (including inactive)
export function useAdminExercises() {
  return useQuery({
    queryKey: ['admin-exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('cycle_phase', { ascending: true })
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Exercise[];
    },
  });
}

// CRUD mutations for meditations
export function useCreateMeditation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (meditation: MeditationInsert) => {
      const { data, error } = await supabase
        .from('meditations')
        .insert(meditation)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meditations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-meditations'] });
    },
  });
}

export function useUpdateMeditation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...meditation }: Partial<Meditation> & { id: string }) => {
      const { data, error } = await supabase
        .from('meditations')
        .update(meditation)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meditations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-meditations'] });
    },
  });
}

export function useDeleteMeditation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meditations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meditations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-meditations'] });
    },
  });
}

// CRUD mutations for exercises
export function useCreateExercise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (exercise: ExerciseInsert) => {
      const { data, error } = await supabase
        .from('exercises')
        .insert(exercise)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
    },
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...exercise }: Partial<Exercise> & { id: string }) => {
      const { data, error } = await supabase
        .from('exercises')
        .update(exercise)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
    },
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
    },
  });
}

// Image upload helper
export async function uploadContentImage(file: File, folder: string = 'meditations'): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('content-images')
    .upload(fileName, file);
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('content-images')
    .getPublicUrl(fileName);
  
  return publicUrl;
}
