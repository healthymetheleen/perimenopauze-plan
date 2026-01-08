// Shared prompt fetching utilities for edge functions
// Fetches prompts from the ai_prompts table, with fallback to hardcoded defaults

import { createClient } from "npm:@supabase/supabase-js@2";

export type SupportedLanguage = 'nl' | 'en';

export interface AIPrompt {
  prompt_key: string;
  prompt_nl: string;
  prompt_en: string;
  is_system_prompt: boolean;
}

// In-memory cache with TTL
const promptCache: Map<string, { prompt: AIPrompt; fetchedAt: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches a prompt from the database by key, with caching and fallback
 * @param promptKey - The unique key for the prompt (e.g., 'weekly_nutrition_system')
 * @param language - 'nl' or 'en'
 * @param fallback - Fallback prompt text if database fetch fails
 * @returns The prompt text in the requested language
 */
export async function getPrompt(
  promptKey: string,
  language: SupportedLanguage,
  fallback: string
): Promise<string> {
  try {
    // Check cache first
    const cached = promptCache.get(promptKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      console.log(`[prompts] Cache hit for ${promptKey}`);
      return language === 'en' ? cached.prompt.prompt_en : cached.prompt.prompt_nl;
    }

    // Create service role client for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[prompts] Missing Supabase credentials, using fallback');
      return fallback;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('ai_prompts')
      .select('prompt_key, prompt_nl, prompt_en, is_system_prompt')
      .eq('prompt_key', promptKey)
      .single();

    if (error || !data) {
      console.warn(`[prompts] Failed to fetch prompt ${promptKey}:`, error?.message);
      return fallback;
    }

    // Update cache
    promptCache.set(promptKey, { prompt: data, fetchedAt: Date.now() });
    console.log(`[prompts] Fetched ${promptKey} from database`);

    return language === 'en' ? data.prompt_en : data.prompt_nl;
  } catch (err) {
    console.error(`[prompts] Error fetching prompt ${promptKey}:`, err);
    return fallback;
  }
}

/**
 * Fetches multiple prompts at once for efficiency
 * @param promptKeys - Array of prompt keys to fetch
 * @param language - 'nl' or 'en'
 * @param fallbacks - Object mapping prompt keys to fallback values
 * @returns Object mapping prompt keys to prompt texts
 */
export async function getPrompts(
  promptKeys: string[],
  language: SupportedLanguage,
  fallbacks: Record<string, string>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const keysToFetch: string[] = [];

  // Check cache first
  for (const key of promptKeys) {
    const cached = promptCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      result[key] = language === 'en' ? cached.prompt.prompt_en : cached.prompt.prompt_nl;
    } else {
      keysToFetch.push(key);
    }
  }

  if (keysToFetch.length === 0) {
    console.log('[prompts] All prompts served from cache');
    return result;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[prompts] Missing Supabase credentials, using fallbacks');
      for (const key of keysToFetch) {
        result[key] = fallbacks[key] || '';
      }
      return result;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('ai_prompts')
      .select('prompt_key, prompt_nl, prompt_en, is_system_prompt')
      .in('prompt_key', keysToFetch);

    if (error) {
      console.warn('[prompts] Failed to fetch prompts:', error.message);
      for (const key of keysToFetch) {
        result[key] = fallbacks[key] || '';
      }
      return result;
    }

    // Process fetched prompts
    const fetchedKeys = new Set<string>();
    for (const prompt of data || []) {
      promptCache.set(prompt.prompt_key, { prompt, fetchedAt: Date.now() });
      result[prompt.prompt_key] = language === 'en' ? prompt.prompt_en : prompt.prompt_nl;
      fetchedKeys.add(prompt.prompt_key);
    }

    // Use fallbacks for any missing prompts
    for (const key of keysToFetch) {
      if (!fetchedKeys.has(key)) {
        console.warn(`[prompts] Prompt ${key} not found in database, using fallback`);
        result[key] = fallbacks[key] || '';
      }
    }

    console.log(`[prompts] Fetched ${fetchedKeys.size} prompts from database`);
    return result;
  } catch (err) {
    console.error('[prompts] Error fetching prompts:', err);
    for (const key of keysToFetch) {
      result[key] = fallbacks[key] || '';
    }
    return result;
  }
}

/**
 * Clears the prompt cache (useful for testing or forcing refresh)
 */
export function clearPromptCache(): void {
  promptCache.clear();
  console.log('[prompts] Cache cleared');
}
