import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_AI_LIMIT = 30;

// Privacy: generate AI subject ID (not reversible without DB)
function generateAISubjectId(userId: string): string {
  let hash = 0;
  const salt = 'ai_subject_v1_';
  const input = salt + userId;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `subj_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

// Scrub PII from text before AI calls
function scrubPII(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b(\+?\d[\d\s().-]{7,}\d)\b/g, '[phone]')
    .replace(/\b\d{4}\s?[A-Z]{2}\b/gi, '[postcode]')
    .replace(/\b(?:straat|laan|weg|plein|singel|gracht|kade|dijk|pad)\b.*?\d+\b/gi, '[address]')
    .replace(/\b(ik ben|mijn naam is|ik heet|my name is|i am)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/gi, '$1 [naam]');
}

/**
 * Strip EXIF metadata from base64 image to remove GPS, device, timestamp info
 * Returns clean JPEG base64 without metadata
 */
function stripExifFromBase64(base64Image: string): string {
  try {
    // Extract the base64 data part
    let base64Data = base64Image;
    let prefix = '';
    
    if (base64Image.startsWith('data:')) {
      const commaIndex = base64Image.indexOf(',');
      if (commaIndex > -1) {
        prefix = base64Image.substring(0, commaIndex + 1);
        base64Data = base64Image.substring(commaIndex + 1);
      }
    }
    
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Check if it's a JPEG (starts with 0xFF 0xD8)
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
      // Not a JPEG, return as-is (PNG doesn't have EXIF in same way)
      return base64Image;
    }
    
    // Find and remove EXIF segments (APP1 = 0xFF 0xE1)
    const cleanBytes: number[] = [];
    let i = 0;
    
    while (i < bytes.length) {
      // Copy SOI marker (start of image)
      if (i === 0) {
        cleanBytes.push(bytes[i], bytes[i + 1]);
        i += 2;
        continue;
      }
      
      // Check for marker
      if (bytes[i] === 0xFF) {
        const marker = bytes[i + 1];
        
        // Skip APP1 (EXIF), APP2-APP15 markers (metadata)
        if (marker >= 0xE1 && marker <= 0xEF) {
          // Get segment length and skip
          const segmentLength = (bytes[i + 2] << 8) | bytes[i + 3];
          i += 2 + segmentLength;
          continue;
        }
        
        // For other markers, copy them
        if (marker === 0xD8 || marker === 0xD9) {
          // SOI or EOI - just the marker
          cleanBytes.push(bytes[i], bytes[i + 1]);
          i += 2;
        } else if (marker >= 0xD0 && marker <= 0xD7) {
          // RST markers - just the marker
          cleanBytes.push(bytes[i], bytes[i + 1]);
          i += 2;
        } else if (marker === 0x00 || marker === 0xFF) {
          // Stuffed byte or fill
          cleanBytes.push(bytes[i]);
          i += 1;
        } else {
          // Segment with length
          const segmentLength = (bytes[i + 2] << 8) | bytes[i + 3];
          for (let j = 0; j < segmentLength + 2 && i + j < bytes.length; j++) {
            cleanBytes.push(bytes[i + j]);
          }
          i += 2 + segmentLength;
        }
      } else {
        // Raw data
        cleanBytes.push(bytes[i]);
        i += 1;
      }
    }
    
    // Convert back to base64
    const cleanArray = new Uint8Array(cleanBytes);
    let binary = '';
    for (let i = 0; i < cleanArray.length; i++) {
      binary += String.fromCharCode(cleanArray[i]);
    }
    
    const cleanBase64 = btoa(binary);
    return prefix ? prefix + cleanBase64 : cleanBase64;
    
  } catch (error) {
    console.error('EXIF stripping failed, using original:', error);
    return base64Image;
  }
}

// FOOD PARSING PROMPT - Verbeterde Nederlandse voedselherkenning met ranges en confidence
const foodParsingPrompt = `Je bent een voedingsexpert die Nederlandse maaltijdbeschrijvingen analyseert.

BELANGRIJKE RICHTLIJNEN:
- Je bent GEEN arts of diëtist met behandelrelatie
- Je geeft GEEN medisch voedingsadvies
- Je doet GEEN uitspraken over allergieën of intoleranties
- GEEN oordelen over of voedsel "gezond" of "ongezond" is

TAAK: Analyseer de maaltijd en geef voedingswaarden met RANGES en CONFIDENCE SCORES.

VOORBEELDEN VAN INFORMELE BESCHRIJVINGEN:
- "een bak yoghurt met havermout" = 1 portie (200g) yoghurt + 40g havermout
- "boterham met kaas" = 1 snee brood + 1 plak kaas
- "kopje koffie met melk" = 150ml koffie + 30ml melk
- "salade met tonijn" = gemengde sla + blikje tonijn

STANDAARD PORTIEGROOTTES (Nederlandse standaard):
- Bak/kom/bakje yoghurt/kwark: 150-200g
- Portie havermout: 40-50g droog
- Snee brood: 35g
- Plak kaas: 20g
- Ei: 60g
- Portie groenten: 150g
- Glas melk: 200ml
- Kop koffie/thee: 150ml

BEWERKINGSNIVEAU (ultra_processed_level 0-3):
0: Vers/minimaal bewerkt (groenten, fruit, vlees, vis, eieren)
1: Licht bewerkt (yoghurt, olie, boter, kaas)
2: Bewerkt (brood, pasta, ingeblikt)
3: Ultra-bewerkt (frisdrank, chips, snoep, kant-en-klaar)

Antwoord ALLEEN met een JSON object:
{
  "description": "gedetailleerde beschrijving met portie en bereiding (bijv. '2 sneetjes volkoren brood met 2 plakjes belegen kaas (40g) en een gekookt ei')",
  "items": [
    {
      "name": "item naam",
      "grams": number,
      "kcal": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number,
      "processing_level": 0-3
    }
  ],
  "totals": {
    "kcal_min": number,
    "kcal_max": number,
    "kcal": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number,
    "alcohol_g": number | null,
    "caffeine_mg": number | null
  },
  "ultra_processed_level": 0-3,
  "confidence": 0.0-1.0,
  "missing_info": ["portie onbekend", "saus onbekend"],
  "clarification_question": "string of null - vraag om verduidelijking als confidence < 0.5",
  "quality_flags": {
    "has_protein": boolean,
    "has_fiber": boolean,
    "has_vegetables": boolean,
    "is_ultra_processed": boolean,
    "is_late_meal": false
  }
}

BELANGRIJK:
- **description** moet GEDETAILLEERD zijn: noem exact welke producten, hoeveel (grammen of stuks), en hoe bereid
- confidence is een getal tussen 0.0 en 1.0 (bijv. 0.62, 0.85)
- kcal_min en kcal_max geven de range aan (bijv. 520-720)
- kcal is het gemiddelde van de range
- missing_info bevat ALLE ontbrekende informatie die de schatting beïnvloedt
- **clarification_question**: Als confidence < 0.5, stel EEN duidelijke vraag om de maaltijd beter te begrijpen. Bijv: "Hoeveel sneetjes brood waren het?" of "Welke saus zat erbij?"
- Bij informele beschrijvingen, gebruik standaard portiegroottes
- alcohol_g en caffeine_mg alleen invullen indien relevant (anders null)
- Hoe meer info ontbreekt, hoe breder de range en lager de confidence`;

// Helper: Authenticate user and check limits
async function authenticateAndCheckLimits(req: Request): Promise<{ user: any; supabase: any; aiSubjectId: string } | Response> {
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

  // Generate pseudonymous ID for logging (never log real user_id with AI data)
  const aiSubjectId = generateAISubjectId(user.id);

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

  return { user, supabase, aiSubjectId };
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate and check limits
    const authResult = await authenticateAndCheckLimits(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user, supabase, aiSubjectId } = authResult;

    const { description, imageBase64, hasAIConsent, mealTime } = await req.json();
    
    // CONSENT CHECK - verify consent server-side
    if (hasAIConsent === false) {
      const { data: consent } = await supabase
        .from('user_consents')
        .select('accepted_ai_processing')
        .eq('owner_id', user.id)
        .single();

      if (!consent?.accepted_ai_processing) {
        return new Response(JSON.stringify({
          error: 'consent_required',
          message: 'Om AI-analyse te gebruiken is toestemming nodig. Schakel dit in bij Instellingen.',
          description: description || 'Maaltijd',
          items: [],
          totals: { kcal: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null },
          ultra_processed_level: null,
          confidence: 'low',
          verification_questions: [],
          quality_flags: {},
          notes: 'Vul de waarden handmatig in of schakel AI-ondersteuning in bij Instellingen.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Use direct OpenAI API for full control and GDPR compliance
    const OPENAI_API_KEY = Deno.env.get('ChatGPT');
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      throw new Error('AI service is niet geconfigureerd');
    }

    // PRIVACY: Scrub PII from description before sending to AI
    const scrubbedDescription = description ? scrubPII(description) : null;

    // Build user content - NO PII, only food description and image
    const userContent: any[] = [];
    
    if (scrubbedDescription) {
      userContent.push({
        type: 'text',
        text: `Analyseer deze maaltijd: ${scrubbedDescription}`
      });
    }
    
    if (imageBase64) {
      // PRIVACY: Strip EXIF metadata (GPS, device info, timestamps) before sending to OpenAI
      console.log('Stripping EXIF metadata from image for subject:', aiSubjectId);
      const cleanImage = stripExifFromBase64(imageBase64);
      
      userContent.push({
        type: 'image_url',
        image_url: {
          url: cleanImage.startsWith('data:') ? cleanImage : `data:image/jpeg;base64,${cleanImage}`
        }
      });
      if (!scrubbedDescription) {
        userContent.push({
          type: 'text',
          text: 'Analyseer deze maaltijd op de foto.'
        });
      }
    }

    if (userContent.length === 0) {
      throw new Error('Geen beschrijving of foto ontvangen');
    }

    // Track usage BEFORE making the AI call
    await trackUsage(supabase, user.id, 'analyze-meal');

    console.log('Analyzing meal via OpenAI API, subject:', aiSubjectId);
    
    // TWO-TIER AI STRATEGY: Start with gpt-4o-mini (cheap), fallback to gpt-4o if needed
    let analysis;
    let usedFallback = false;
    
    // First try with gpt-4o-mini (cheapest, fast)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: foodParsingPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: 1000,
      }),
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

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    console.log('Meal analysis received for subject:', aiSubjectId);

    // Parse response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response for', aiSubjectId);
      
      // Fallback to gpt-4o for more complex parsing
      if (!usedFallback) {
        console.log('Falling back to gpt-4o for subject:', aiSubjectId);
        usedFallback = true;
        
        const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: foodParsingPrompt },
              { role: 'user', content: userContent }
            ],
            max_tokens: 1000,
          }),
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackContent = fallbackData.choices?.[0]?.message?.content;
          
          try {
            const jsonMatch = fallbackContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysis = JSON.parse(jsonMatch[0]);
            }
          } catch {
            // Both failed
          }
        }
      }
      
      if (!analysis) {
        analysis = {
          description: description || 'Maaltijd',
          items: [],
          totals: { kcal: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null },
          ultra_processed_level: null,
          confidence: 0.3,
          verification_questions: [{
            question: 'De AI kon deze maaltijd niet analyseren. Kun je meer details geven?',
            options: ['Ontbijt met brood', 'Warme maaltijd', 'Snack/tussendoor', 'Drank'],
            affects: 'description'
          }],
          quality_flags: {},
          notes: 'Probeer het opnieuw met een duidelijkere beschrijving of foto.'
        };
      }
    }

    // Add model info
    analysis.model_used = usedFallback ? 'gpt-4o' : 'gpt-4o-mini';

    // Add late meal flag based on time
    if (mealTime) {
      const hour = parseInt(mealTime.split(':')[0], 10);
      if (analysis.quality_flags) {
        analysis.quality_flags.is_late_meal = hour >= 21;
      }
    }

    // Ensure backward compatibility with old format
    if (!analysis.totals && analysis.kcal !== undefined) {
      analysis.totals = {
        kcal: analysis.kcal,
        protein_g: analysis.protein_g,
        carbs_g: analysis.carbs_g,
        fat_g: analysis.fat_g,
        fiber_g: analysis.fiber_g
      };
    }
    
    // Also provide flat values for backward compatibility
    if (analysis.totals) {
      analysis.kcal = analysis.totals.kcal;
      analysis.protein_g = analysis.totals.protein_g;
      analysis.carbs_g = analysis.totals.carbs_g;
      analysis.fat_g = analysis.totals.fat_g;
      analysis.fiber_g = analysis.totals.fiber_g;
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-meal:', error);
    return new Response(JSON.stringify({ 
      error: 'service_error',
      message: 'Er ging iets mis bij de analyse. Probeer het later opnieuw.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
