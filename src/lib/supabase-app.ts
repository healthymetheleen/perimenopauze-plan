import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Untyped Supabase client for 'app' schema queries
 * Since auto-generated types only cover 'public' schema
 */
export const appClient = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'app' },
});