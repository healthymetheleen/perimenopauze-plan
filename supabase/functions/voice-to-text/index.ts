import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_AI_LIMIT = 30;

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// Helper: Authenticate user and check limits
async function authenticateAndCheckLimits(req: Request): Promise<{ user: any; supabase: any } | Response> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }), {
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
    console.error('Auth error:', authError);
    return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check daily AI usage limit server-side
  const today = new Date().toISOString().split('T')[0];
  const { count, error: countError } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .gte('created_at', `${today}T00:00:00Z`);

  if (countError) {
    console.error('Usage count error:', countError);
  }

  if ((count || 0) >= DAILY_AI_LIMIT) {
    return new Response(JSON.stringify({ 
      error: 'limit_exceeded', 
      message: `Dagelijkse AI-limiet (${DAILY_AI_LIMIT}) bereikt. Probeer het morgen opnieuw.` 
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return { user, supabase };
}

// Helper: Track AI usage server-side
async function trackUsage(supabase: any, userId: string, functionName: string) {
  const { error } = await supabase
    .from('ai_usage')
    .insert({ owner_id: userId, function_name: functionName });
  
  if (error) {
    console.error('Failed to track AI usage:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate and check limits
    const authResult = await authenticateAndCheckLimits(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user, supabase } = authResult;

    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('Processing audio data for user:', user.id);

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'nl'); // Dutch

    // Use the ChatGPT secret (which contains OpenAI API key)
    const openAIKey = Deno.env.get('ChatGPT');
    
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Track usage BEFORE making the AI call
    await trackUsage(supabase, user.id, 'voice-to-text');

    console.log('Sending to OpenAI Whisper...');

    // Send to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit',
          message: 'Te veel verzoeken. Probeer het later opnieuw.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI service unavailable');
    }

    const result = await response.json();
    console.log('Transcription completed successfully');

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice-to-text error:', error);
    // Return generic error message to client, never expose internal details
    return new Response(
      JSON.stringify({ 
        error: 'service_error',
        message: 'Er ging iets mis bij de spraakherkenning. Probeer het later opnieuw.' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});