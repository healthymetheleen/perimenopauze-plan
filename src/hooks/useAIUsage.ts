import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const MONTHLY_AI_LIMIT = 30;

export function useAIUsage() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-usage', user?.id],
    queryFn: async () => {
      if (!user) return { remaining: 0, used: 0, limit: MONTHLY_AI_LIMIT };
      
      // Get remaining calls using the database function
      const { data, error } = await supabase.rpc('get_ai_usage_remaining', {
        user_id: user.id,
        monthly_limit: MONTHLY_AI_LIMIT,
      });
      
      if (error) throw error;
      
      const remaining = data as number;
      return {
        remaining,
        used: MONTHLY_AI_LIMIT - remaining,
        limit: MONTHLY_AI_LIMIT,
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });
}

export async function trackAIUsage(functionName: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  // Check if user has remaining calls
  const { data: canUse, error: checkError } = await supabase.rpc('check_ai_limit', {
    user_id: userData.user.id,
    monthly_limit: MONTHLY_AI_LIMIT,
  });

  if (checkError || !canUse) {
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

export { MONTHLY_AI_LIMIT };
