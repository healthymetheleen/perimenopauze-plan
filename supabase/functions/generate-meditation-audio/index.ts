import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// Laura Peeters - Flemish/Dutch young woman, calm and enthusiastic
// Perfect for meditation narrations
const LAURA_PEETERS_VOICE_ID = "FGY2WhTYpPnrIDTdsKH5";

// Alternative Dutch-friendly voices
const VOICE_OPTIONS = {
  'laura': 'FGY2WhTYpPnrIDTdsKH5',  // Laura - calm Dutch female
  'lily': 'pFZP5JQG7iQjIQuC4Bku',   // Lily - soft female
  'alice': 'Xb7hH8MSUJpSbSDYk0k2',  // Alice - gentle female
  'sarah': 'EXAVITQu4vr4xnSDxMaL',  // Sarah - warm female
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text, voice, meditationId, title } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'ElevenLabs API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Select voice (default to Laura Peeters for meditation)
    const selectedVoice = voice && VOICE_OPTIONS[voice as keyof typeof VOICE_OPTIONS] 
      ? VOICE_OPTIONS[voice as keyof typeof VOICE_OPTIONS]
      : LAURA_PEETERS_VOICE_ID;

    console.log(`Generating meditation audio with voice: ${voice || 'laura'}, text length: ${text.length} chars`);

    // Generate speech with ElevenLabs
    // Using multilingual v2 for best Dutch pronunciation
    // Voice settings optimized for calm meditation narration
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.75,           // Higher stability for consistent calm tone
            similarity_boost: 0.75,    // Natural voice matching
            style: 0.3,                // Subtle style for meditation
            use_speaker_boost: true,   // Clear pronunciation
            speed: 0.85,               // Slightly slower for meditation pace
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate audio',
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`Audio generated successfully, size: ${audioBuffer.byteLength} bytes`);

    // If meditationId is provided, upload to storage and update meditation
    if (meditationId) {
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

      // Generate filename
      const timestamp = Date.now();
      const safeTitle = (title || 'meditation').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `${safeTitle}-${timestamp}.mp3`;
      const storagePath = `meditations/${filename}`;

      // Upload to storage
      const { error: uploadError } = await adminSupabase.storage
        .from('meditation-audio')
        .upload(storagePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Still return the audio even if storage fails
      } else {
        // Get public URL
        const { data: urlData } = adminSupabase.storage
          .from('meditation-audio')
          .getPublicUrl(storagePath);

        // Update meditation record with audio URL
        const { error: updateError } = await adminSupabase
          .from('meditations')
          .update({ audio_url: urlData.publicUrl })
          .eq('id', meditationId);

        if (updateError) {
          console.error('Failed to update meditation:', updateError);
        } else {
          console.log(`Meditation ${meditationId} updated with audio URL`);
          return new Response(JSON.stringify({ 
            success: true,
            audioUrl: urlData.publicUrl,
            size: audioBuffer.byteLength,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Return audio directly if not saving to storage
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="meditation-${Date.now()}.mp3"`,
      },
    });

  } catch (error) {
    console.error('Meditation audio generation error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
