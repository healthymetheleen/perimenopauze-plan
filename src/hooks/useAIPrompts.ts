import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface AIPrompt {
  id: string;
  prompt_key: string;
  name: string;
  description: string | null;
  category: string;
  prompt_nl: string;
  prompt_en: string;
  is_system_prompt: boolean;
  created_at: string;
  updated_at: string;
}

export function useAIPrompts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-prompts'],
    queryFn: async (): Promise<AIPrompt[]> => {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as AIPrompt[];
    },
    enabled: !!user,
  });
}

export function useUpdateAIPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prompt_nl, prompt_en }: { id: string; prompt_nl: string; prompt_en: string }) => {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ prompt_nl, prompt_en })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-prompts'] });
    },
  });
}
