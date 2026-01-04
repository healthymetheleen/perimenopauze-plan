/**
 * Shared Edge Function Utilities
 * Security, validation, rate limiting, and audit logging
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for all edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limits per function
export const RATE_LIMITS = {
  'analyze-meal': 30,      // per day
  'premium-insights': 30,  // per day
  'cycle-coach': 30,       // per day
  'monthly-analysis': 3,   // per month
  'voice-to-text': 50,     // per day
} as const;

/**
 * Input validation schemas
 */
export const validators = {
  // Sanitize string input - remove potential injection
  sanitizeString: (input: unknown, maxLength = 1000): string | null => {
    if (typeof input !== 'string') return null;
    // Remove null bytes, trim whitespace, enforce max length
    return input.replace(/\0/g, '').trim().slice(0, maxLength) || null;
  },

  // Validate base64 image
  validateBase64Image: (input: unknown, maxSizeBytes = 5 * 1024 * 1024): string | null => {
    if (typeof input !== 'string') return null;
    // Check if it's a valid data URL or base64
    const base64Regex = /^(data:image\/(jpeg|png|webp|gif);base64,)?[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(input.slice(0, 100))) return null;
    // Rough size check (base64 is ~33% larger than binary)
    if (input.length > maxSizeBytes * 1.4) return null;
    return input;
  },

  // Validate insight type
  validateInsightType: (input: unknown): string | null => {
    const validTypes = ['daily', 'weekly', 'sleep', 'cycle', 'monthly'];
    if (typeof input !== 'string') return null;
    return validTypes.includes(input) ? input : null;
  },

  // Validate boolean
  validateBoolean: (input: unknown): boolean => {
    return input === true || input === 'true';
  },

  // Validate time string (HH:MM)
  validateTime: (input: unknown): string | null => {
    if (typeof input !== 'string') return null;
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(input) ? input : null;
  },

  // Validate date string (YYYY-MM-DD)
  validateDate: (input: unknown): string | null => {
    if (typeof input !== 'string') return null;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input)) return null;
    // Check if it's a valid date
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : input;
  },

  // Validate numeric range
  validateNumber: (input: unknown, min: number, max: number): number | null => {
    const num = typeof input === 'number' ? input : parseFloat(String(input));
    if (isNaN(num) || num < min || num > max) return null;
    return num;
  },
};

/**
 * Authenticate user from request
 * Returns user and supabase client, or error response
 */
export async function authenticateUser(req: Request): Promise<
  { user: { id: string; email?: string }; supabase: any } | Response
> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ 
      error: 'unauthorized', 
      message: 'Authentication required' 
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Auth error:', authError?.message);
    return new Response(JSON.stringify({ 
      error: 'unauthorized', 
      message: 'Invalid or expired token' 
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return { user, supabase };
}

/**
 * Check rate limit for a function
 */
export async function checkRateLimit(
  supabase: any,
  userId: string,
  functionName: keyof typeof RATE_LIMITS,
  period: 'day' | 'month' = 'day'
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const limit = RATE_LIMITS[functionName] || 30;
  const now = new Date();
  
  let periodStart: Date;
  let resetAt: Date;
  
  if (period === 'month') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else {
    periodStart = new Date(now.toISOString().split('T')[0] + 'T00:00:00Z');
    resetAt = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
  }

  const { count, error } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('function_name', functionName)
    .gte('created_at', periodStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    // Fail open but log
    return { allowed: true, remaining: 0, resetAt };
  }

  const currentCount = count || 0;
  const remaining = Math.max(0, limit - currentCount);

  return {
    allowed: currentCount < limit,
    remaining,
    resetAt,
  };
}

/**
 * Track AI usage
 */
export async function trackUsage(
  supabase: any,
  userId: string,
  functionName: string
): Promise<void> {
  const { error } = await supabase
    .from('ai_usage')
    .insert({ owner_id: userId, function_name: functionName });
  
  if (error) {
    console.error('Failed to track AI usage:', error);
  }
}

/**
 * Log audit event (for admin/security actions)
 * Uses service role to bypass RLS
 */
export async function logAudit(
  action: string,
  actorId: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    await adminClient.from('audit_logs').insert({
      actor_id: actorId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata: metadata || {},
      // Note: IP address would need to be passed from the request
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Verify AI consent server-side
 */
export async function verifyAIConsent(
  supabase: any,
  userId: string
): Promise<boolean> {
  const { data: consent } = await supabase
    .from('user_consents')
    .select('accepted_ai_processing')
    .eq('owner_id', userId)
    .single();

  return consent?.accepted_ai_processing === true;
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitResponse(remaining: number, resetAt: Date): Response {
  return new Response(JSON.stringify({ 
    error: 'rate_limit_exceeded', 
    message: `Limiet bereikt. Probeer het later opnieuw.`,
    remaining,
    resetAt: resetAt.toISOString(),
  }), {
    status: 429,
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': resetAt.toISOString(),
    },
  });
}

/**
 * Create a consent required response
 */
export function consentRequiredResponse(defaultData?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({
    error: 'consent_required',
    message: 'AI-analyse vereist toestemming. Schakel dit in bij Instellingen.',
    ...(defaultData || {}),
  }), {
    status: 200, // Return 200 with error flag for graceful handling
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create an error response without exposing internal details
 */
export function errorResponse(
  status: number, 
  errorCode: string, 
  userMessage: string
): Response {
  return new Response(JSON.stringify({ 
    error: errorCode,
    message: userMessage,
  }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create a success response
 */
export function successResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Strip PII from data before sending to AI
 * Returns anonymized version safe for AI prompts
 */
export function anonymizeForAI(data: Record<string, unknown>): Record<string, unknown> {
  const piiFields = [
    'id', 'user_id', 'owner_id', 'email', 'name', 'display_name',
    'created_at', 'updated_at', 'ip_address', 'user_agent'
  ];
  
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip PII fields
    if (piiFields.includes(key.toLowerCase())) continue;
    
    // Recursively anonymize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = anonymizeForAI(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'object' ? anonymizeForAI(item as Record<string, unknown>) : item
      );
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Generate a simple hash for cache keys
 */
export function hashData(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
