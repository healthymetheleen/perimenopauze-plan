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
  "description": "korte neutrale beschrijving",
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
  "quality_flags": {
    "has_protein": boolean,
    "has_fiber": boolean,
    "has_vegetables": boolean,
    "is_ultra_processed": boolean,
    "is_late_meal": false
  }
}

BELANGRIJK:
- confidence is een getal tussen 0.0 en 1.0 (bijv. 0.62, 0.85)
- kcal_min en kcal_max geven de range aan (bijv. 520-720)
- kcal is het gemiddelde van de range
- missing_info bevat ALLE ontbrekende informatie die de schatting beïnvloedt
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
    
    // Use Lovable AI Gateway (no direct OpenAI calls from Edge Functions)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
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
      // WARNING: Images may contain PII (faces, documents, addresses)
      // TODO: Consider EXIF stripping and downscaling for production
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
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

    console.log('Analyzing meal via Lovable AI, subject:', aiSubjectId);
    
    // Use Lovable AI Gateway with flash model for meal analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: foodParsingPrompt },
          { role: 'user', content: userContent }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit',
          message: 'Te veel verzoeken. Probeer het later opnieuw.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'service_unavailable',
          message: 'De AI-service is tijdelijk niet beschikbaar.' 
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI service unavailable');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    console.log('Meal analysis received for subject:', aiSubjectId);

    // Parse response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response for', aiSubjectId);
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
