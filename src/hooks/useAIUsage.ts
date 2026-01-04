import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Daily AI limit (matches edge function limit)
const DAILY_AI_LIMIT = 30;

export function useAIUsage() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-usage', user?.id, new Date().toISOString().split('T')[0]],
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
    staleTime: 30 * 1000, // 30 seconds for more accurate count
  });
}

// Note: AI usage is now tracked server-side in edge functions
// This function is kept for backward compatibility but just checks limits
export async function trackAIUsage(functionName: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  // Check daily limit (usage is tracked server-side)
  const today = new Date().toISOString().split('T')[0];
  
  const { count, error: countError } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userData.user.id)
    .gte('created_at', `${today}T00:00:00Z`);

  if (countError || (count || 0) >= DAILY_AI_LIMIT) {
    return false;
  }

  // Usage is tracked server-side, so just return true if under limit
  return true;
}

export { DAILY_AI_LIMIT };
