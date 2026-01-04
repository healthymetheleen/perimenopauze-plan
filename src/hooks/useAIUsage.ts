import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Monthly AI limit (approximately $1-2 cost at Gemini Flash pricing)
const MONTHLY_AI_LIMIT = 100;

export function useAIUsage() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-usage', user?.id],
    queryFn: async () => {
      if (!user) return { remaining: 0, used: 0, limit: MONTHLY_AI_LIMIT };
      
      // Get current month's usage
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { count, error } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .gte('created_at', monthStart);
      
      if (error) throw error;
      
      const used = count || 0;
      return {
        remaining: Math.max(0, MONTHLY_AI_LIMIT - used),
        used,
        limit: MONTHLY_AI_LIMIT,
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Note: AI usage is now tracked server-side in edge functions
// This function is kept for backward compatibility but just checks limits
export async function trackAIUsage(functionName: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  // Check monthly limit (usage is now tracked server-side)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const { count, error: countError } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userData.user.id)
    .gte('created_at', monthStart);

  if (countError || (count || 0) >= MONTHLY_AI_LIMIT) {
    return false;
  }

  // Usage is now tracked server-side, so just return true if under limit
  return true;
}

export { MONTHLY_AI_LIMIT };
