import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const DAILY_AI_LIMIT = 30;

export function useAIUsage() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-usage', user?.id],
    queryFn: async () => {
      if (!user) return { remaining: 0, used: 0, limit: DAILY_AI_LIMIT };
      
      // Get today's usage
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .gte('created_at', `${today}T00:00:00Z`);
      
      if (error) throw error;
      
      const used = count || 0;
      return {
        remaining: Math.max(0, DAILY_AI_LIMIT - used),
        used,
        limit: DAILY_AI_LIMIT,
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });
}

export async function trackAIUsage(functionName: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  // Check daily limit
  const today = new Date().toISOString().split('T')[0];
  const { count, error: countError } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userData.user.id)
    .gte('created_at', `${today}T00:00:00Z`);

  if (countError || (count || 0) >= DAILY_AI_LIMIT) {
    return false;
  }

  // Track the usage
  const { error: insertError } = await supabase
    .from('ai_usage')
    .insert({
      owner_id: userData.user.id,
      function_name: functionName,
    });

  return !insertError;
}

export { DAILY_AI_LIMIT };
