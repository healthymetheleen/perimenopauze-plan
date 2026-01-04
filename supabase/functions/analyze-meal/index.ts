import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_AI_LIMIT = 30;

// FOOD PARSING PROMPT - Verbeterde item herkenning met attributen
const foodParsingPrompt = `Je bent een voedingsexpert die maaltijden analyseert naar gestructureerde items.

BELANGRIJKE RICHTLIJNEN:
- Je bent GEEN arts of diëtist met behandelrelatie
- Je geeft GEEN medisch voedingsadvies
- Je doet GEEN uitspraken over allergieën of intoleranties
- GEEN oordelen over of voedsel "gezond" of "ongezond" is

Je taak:
1. Identificeer alle items in de maaltijd
2. Schat voedingswaarden per item
3. Bepaal het bewerkingsniveau
4. Stel maximaal 1-2 verificatievragen als je onzeker bent

ITEM CATEGORIEËN:
- brood: wit, volkoren, spelt, zuurdesem, glutenvrij, met_zaden
- zuivel: melk_vol, melk_mager, yoghurt_vol, yoghurt_mager, grieks, skyr, plantaardig
- kaas: jong, belegen, oud, geitenkaas, feta, mozzarella
- vlees: rood, wit, verwerkt (worst, bacon, ham)
- vis: vet (zalm, makreel), mager (kabeljauw, tilapia), verwerkt
- groenten: rauw, gekookt, verwerkt
- fruit: vers, gedroogd, sap
- granen: wit, volkoren, havermout
- noten_zaden: ongezouten, gezouten, gesuikerd
- dranken: water, koffie, thee, frisdrank, alcohol
- snacks: chips, koekjes, chocolade, noten
- sauzen: mayonaise, ketchup, dressing, olie

BEWERKINGSNIVEAU (ultra_processed_level 0-10):
0-2: Vers/minimaal bewerkt (groenten, fruit, vlees, vis, eieren)
3-4: Bewerkte ingrediënten (olie, boter, suiker, bloem)
5-6: Bewerkte voeding (kaas, brood, ingeblikt)
7-8: Ultra-bewerkt (frisdrank, chips, kant-en-klaar)
9-10: Zeer ultra-bewerkt (fast food, energiedranken)

Antwoord ALLEEN met een JSON object:
{
  "description": "korte neutrale beschrijving",
  "items": [
    {
      "name": "item naam",
      "category": "categorie",
      "attributes": ["attribuut1", "attribuut2"],
      "quantity": "hoeveelheid (1 snee, 200g, etc)",
      "kcal": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number,
      "processing_level": 0-10
    }
  ],
  "totals": {
    "kcal": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number
  },
  "ultra_processed_level": 0-10 (gewogen gemiddelde),
  "confidence": "high" | "medium" | "low",
  "verification_questions": [
    {
      "question": "Was dit volkoren of wit brood?",
      "options": ["volkoren", "wit", "zuurdesem", "weet niet"],
      "affects": "fiber_g"
    }
  ],
  "quality_flags": {
    "has_protein": boolean (>15g eiwit per maaltijd),
    "has_fiber": boolean (>5g vezels per maaltijd),
    "has_vegetables": boolean,
    "is_ultra_processed": boolean (level >= 7),
    "is_late_meal": false
  },
  "notes": "optionele opmerking over schatting"
}

Richtlijnen:
- Wees realistisch met portiegroottes (Nederlandse porties)
- Bij twijfel, kies gemiddelde portie
- Stel max 2 verificatievragen voor de belangrijkste items
- Alle getallen zijn integers of floats
- GEEN uitspraken over gezondheid`;

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
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('OpenAI meal analysis received');

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysis = {
        description: description || 'Onbekende maaltijd',
        items: [],
        totals: {
          kcal: null,
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          fiber_g: null
        },
        ultra_processed_level: null,
        confidence: 'low',
        verification_questions: [],
        quality_flags: {},
        notes: 'Kon de maaltijd niet analyseren. Vul de waarden handmatig in.'
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