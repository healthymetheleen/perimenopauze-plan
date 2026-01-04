import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_AI_LIMIT = 30;

// FOOD PARSING PROMPT - Verbeterde Nederlandse voedselherkenning
const foodParsingPrompt = `Je bent een voedingsexpert die Nederlandse maaltijdbeschrijvingen analyseert.

BELANGRIJKE RICHTLIJNEN:
- Je bent GEEN arts of diëtist met behandelrelatie
- Je geeft GEEN medisch voedingsadvies
- Je doet GEEN uitspraken over allergieën of intoleranties
- GEEN oordelen over of voedsel "gezond" of "ongezond" is

TAAK: Analyseer de maaltijd en geef voedingswaarden. Wees flexibel met informele beschrijvingen.

VOORBEELDEN VAN INFORMELE BESCHRIJVINGEN:
- "een bak yoghurt met havermout" = 1 portie (200g) yoghurt + 40g havermout
- "boterham met kaas" = 1 snee brood + 1 plak kaas
- "kopje koffie met melk" = 150ml koffie + 30ml melk
- "salade met tonijn" = gemengde sla + blikje tonijn
- "kommetje muesli" = 50g muesli + 125ml melk
- "broodje gezond" = brood + kaas + groenten
- "glas wijn" = 150ml wijn
- "bakje kwark" = 150g kwark

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
      "category": "categorie",
      "attributes": ["attribuut1"],
      "quantity": "hoeveelheid",
      "kcal": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number,
      "processing_level": 0-3
    }
  ],
  "totals": {
    "kcal": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number
  },
  "ultra_processed_level": 0-3,
  "confidence": "high" | "medium" | "low",
  "verification_questions": [],
  "quality_flags": {
    "has_protein": boolean,
    "has_fiber": boolean,
    "has_vegetables": boolean,
    "is_ultra_processed": boolean,
    "is_late_meal": false
  },
  "notes": "optionele opmerking"
}

BELANGRIJK:
- Bij informele beschrijvingen ("bak", "kommetje", "bakje"), gebruik standaard portiegroottes
- Wees niet te streng - als je redelijkerwijs kunt afleiden wat bedoeld wordt, doe dat
- Bij twijfel: kies gemiddelde portie en confidence "medium"`;

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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate and check limits
    const authResult = await authenticateAndCheckLimits(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user, supabase } = authResult;

    const { description, imageBase64, hasAIConsent, mealTime } = await req.json();
    
    // CONSENT CHECK - verify consent server-side
    if (hasAIConsent === false) {
      // Also verify from database
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
    
    // Use OpenAI API key from Supabase secrets
    const openAIKey = Deno.env.get('ChatGPT');
    if (!openAIKey) {
      console.error('OpenAI API key not configured');
      throw new Error('AI service is niet geconfigureerd');
    }

    // Build user content
    const userContent: any[] = [];
    
    if (description) {
      userContent.push({
        type: 'text',
        text: `Analyseer deze maaltijd: ${description}`
      });
    }
    
    if (imageBase64) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
        }
      });
      if (!description) {
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

    console.log('Sending meal data to OpenAI for analysis (user:', user.id, ')');
    
    // TWO-TIER AI STRATEGY: Start with nano (cheap), fallback to mini if needed
    let analysis;
    let usedFallback = false;
    
    // First try with gpt-5-nano (cheapest)
    const nanoResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          { role: 'system', content: foodParsingPrompt },
          { role: 'user', content: userContent }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!nanoResponse.ok) {
      const errorText = await nanoResponse.text();
      console.error('OpenAI API error:', nanoResponse.status, errorText);
      
      if (nanoResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit',
          message: 'Te veel verzoeken. Probeer het later opnieuw.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (nanoResponse.status === 402) {
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

    const nanoData = await nanoResponse.json();
    const nanoContent = nanoData.choices?.[0]?.message?.content;
    
    console.log('Nano response received');

    // Parse nano response
    try {
      const jsonMatch = nanoContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse nano AI response:', parseError);
      // Set confidence low to trigger fallback to mini
      analysis = {
        confidence: 'low',
        needs_review: true
      };
    }

    // CHECK IF FALLBACK TO MINI IS NEEDED
    // Fallback if: confidence is low, needs_review is true, or image analysis with uncertain result
    const needsFallback = 
      analysis.confidence === 'low' || 
      analysis.needs_review === true ||
      (imageBase64 && analysis.confidence !== 'high');

    if (needsFallback) {
      console.log('Low confidence from nano, falling back to gpt-5-mini (user:', user.id, ')');
      usedFallback = true;
      
      const miniResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini-2025-08-07',
          messages: [
            { role: 'system', content: foodParsingPrompt },
            { role: 'user', content: userContent }
          ],
          max_completion_tokens: 1000,
        }),
      });

      if (miniResponse.ok) {
        const miniData = await miniResponse.json();
        const miniContent = miniData.choices?.[0]?.message?.content;
        
        try {
          const jsonMatch = miniContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
            console.log('Mini fallback successful');
          } else {
            // Both nano and mini failed to return valid JSON
            console.error('Mini also returned no valid JSON');
            analysis = {
              description: description || 'Maaltijd',
              items: [],
              totals: { kcal: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null },
              ultra_processed_level: null,
              confidence: 'low',
              verification_questions: [{
                question: 'De AI kon deze maaltijd niet analyseren. Kun je meer details geven?',
                options: ['Ontbijt met brood', 'Warme maaltijd', 'Snack/tussendoor', 'Drank'],
                affects: 'description'
              }],
              quality_flags: {},
              notes: 'Probeer het opnieuw met een duidelijkere beschrijving of foto.'
            };
          }
        } catch (parseError) {
          console.error('Failed to parse mini AI response');
          analysis = {
            description: description || 'Maaltijd',
            items: [],
            totals: { kcal: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null },
            ultra_processed_level: null,
            confidence: 'low',
            verification_questions: [{
              question: 'De AI kon deze maaltijd niet analyseren. Kun je meer details geven?',
              options: ['Ontbijt met brood', 'Warme maaltijd', 'Snack/tussendoor', 'Drank'],
              affects: 'description'
            }],
            quality_flags: {},
            notes: 'Probeer het opnieuw met een duidelijkere beschrijving of foto.'
          };
        }
      } else {
        console.error('Mini fallback failed');
        analysis = {
          description: description || 'Maaltijd',
          items: [],
          totals: { kcal: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null },
          ultra_processed_level: null,
          confidence: 'low',
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
    
    // Add metadata about which model was used
    analysis.model_used = usedFallback ? 'gpt-5-mini' : 'gpt-5-nano';

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
    // Return generic error message to client, never expose internal details
    return new Response(JSON.stringify({ 
      error: 'service_error',
      message: 'Er ging iets mis bij de analyse. Probeer het later opnieuw.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});