import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_AI_LIMIT = 30;

type SupportedLanguage = 'nl' | 'en';

function getLanguage(lang?: string): SupportedLanguage {
  if (lang === 'en') return 'en';
  return 'nl';
}

const translations = {
  nl: {
    limitExceeded: 'Dagelijkse AI-limiet bereikt. Probeer het morgen opnieuw.',
    rateLimit: 'Te veel verzoeken. Probeer het later opnieuw.',
    serviceError: 'Er ging iets mis bij de analyse. Probeer het later opnieuw.',
    unauthorized: 'Authenticatie vereist',
    consentRequired: 'Om AI-analyse te gebruiken is toestemming nodig. Schakel dit in bij Instellingen.',
    noDescription: 'Geen beschrijving of foto ontvangen',
    manualInput: 'Vul de waarden handmatig in of schakel AI-ondersteuning in bij Instellingen.',
    fallbackQuestion: 'De AI kon deze maaltijd niet analyseren. Kun je meer details geven?',
    fallbackNote: 'Probeer het opnieuw met een duidelijkere beschrijving of foto.',
    mealLabel: 'Maaltijd',
    optionBreakfast: 'Ontbijt met brood',
    optionWarm: 'Warme maaltijd',
    optionSnack: 'Snack/tussendoor',
    optionDrink: 'Drank',
  },
  en: {
    limitExceeded: 'Daily AI limit reached. Please try again tomorrow.',
    rateLimit: 'Too many requests. Please try again later.',
    serviceError: 'Something went wrong during analysis. Please try again later.',
    unauthorized: 'Authentication required',
    consentRequired: 'Consent is required to use AI analysis. Enable this in Settings.',
    noDescription: 'No description or photo received',
    manualInput: 'Enter values manually or enable AI support in Settings.',
    fallbackQuestion: 'The AI could not analyze this meal. Can you provide more details?',
    fallbackNote: 'Try again with a clearer description or photo.',
    mealLabel: 'Meal',
    optionBreakfast: 'Breakfast with bread',
    optionWarm: 'Warm meal',
    optionSnack: 'Snack',
    optionDrink: 'Drink',
  },
};

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
 */
function stripExifFromBase64(base64Image: string): string {
  try {
    let base64Data = base64Image;
    let prefix = '';
    
    if (base64Image.startsWith('data:')) {
      const commaIndex = base64Image.indexOf(',');
      if (commaIndex > -1) {
        prefix = base64Image.substring(0, commaIndex + 1);
        base64Data = base64Image.substring(commaIndex + 1);
      }
    }
    
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
      return base64Image;
    }
    
    const cleanBytes: number[] = [];
    let i = 0;
    
    while (i < bytes.length) {
      if (i === 0) {
        cleanBytes.push(bytes[i], bytes[i + 1]);
        i += 2;
        continue;
      }
      
      if (bytes[i] === 0xFF) {
        const marker = bytes[i + 1];
        
        if (marker >= 0xE1 && marker <= 0xEF) {
          const segmentLength = (bytes[i + 2] << 8) | bytes[i + 3];
          i += 2 + segmentLength;
          continue;
        }
        
        if (marker === 0xD8 || marker === 0xD9) {
          cleanBytes.push(bytes[i], bytes[i + 1]);
          i += 2;
        } else if (marker >= 0xD0 && marker <= 0xD7) {
          cleanBytes.push(bytes[i], bytes[i + 1]);
          i += 2;
        } else if (marker === 0x00 || marker === 0xFF) {
          cleanBytes.push(bytes[i]);
          i += 1;
        } else {
          const segmentLength = (bytes[i + 2] << 8) | bytes[i + 3];
          for (let j = 0; j < segmentLength + 2 && i + j < bytes.length; j++) {
            cleanBytes.push(bytes[i + j]);
          }
          i += 2 + segmentLength;
        }
      } else {
        cleanBytes.push(bytes[i]);
        i += 1;
      }
    }
    
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

// Bilingual food parsing prompts
const foodParsingPrompts = {
  nl: `Je bent een voedingsexpert die Nederlandse maaltijdbeschrijvingen analyseert.

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
- Hoe meer info ontbreekt, hoe breder de range en lager de confidence`,

  en: `You are a nutrition expert analyzing meal descriptions.

IMPORTANT GUIDELINES:
- You are NOT a doctor or dietitian with a treatment relationship
- You provide NO medical nutrition advice
- You make NO statements about allergies or intolerances
- NO judgments about whether food is "healthy" or "unhealthy"

TASK: Analyze the meal and provide nutritional values with RANGES and CONFIDENCE SCORES.

EXAMPLES OF INFORMAL DESCRIPTIONS:
- "a bowl of yogurt with oatmeal" = 1 portion (200g) yogurt + 40g oatmeal
- "toast with cheese" = 1 slice bread + 1 slice cheese
- "cup of coffee with milk" = 150ml coffee + 30ml milk
- "salad with tuna" = mixed greens + can of tuna

STANDARD PORTION SIZES:
- Bowl of yogurt/quark: 150-200g
- Portion of oatmeal: 40-50g dry
- Slice of bread: 35g
- Slice of cheese: 20g
- Egg: 60g
- Portion of vegetables: 150g
- Glass of milk: 200ml
- Cup of coffee/tea: 150ml

PROCESSING LEVEL (ultra_processed_level 0-3):
0: Fresh/minimally processed (vegetables, fruit, meat, fish, eggs)
1: Lightly processed (yogurt, oil, butter, cheese)
2: Processed (bread, pasta, canned)
3: Ultra-processed (soda, chips, candy, ready-made meals)

Answer ONLY with a JSON object:
{
  "description": "detailed description with portion and preparation (e.g. '2 slices whole wheat bread with 2 slices aged cheese (40g) and a boiled egg')",
  "items": [
    {
      "name": "item name",
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
  "missing_info": ["portion unknown", "sauce unknown"],
  "clarification_question": "string or null - ask for clarification if confidence < 0.5",
  "quality_flags": {
    "has_protein": boolean,
    "has_fiber": boolean,
    "has_vegetables": boolean,
    "is_ultra_processed": boolean,
    "is_late_meal": false
  }
}

IMPORTANT:
- **description** must be DETAILED: specify exact products, amounts (grams or pieces), and preparation
- confidence is a number between 0.0 and 1.0 (e.g. 0.62, 0.85)
- kcal_min and kcal_max indicate the range (e.g. 520-720)
- kcal is the average of the range
- missing_info contains ALL missing information affecting the estimate
- **clarification_question**: If confidence < 0.5, ask ONE clear question to better understand the meal. E.g: "How many slices of bread were there?" or "What sauce was included?"
- For informal descriptions, use standard portion sizes
- alcohol_g and caffeine_mg only fill in if relevant (otherwise null)
- The more info is missing, the wider the range and lower the confidence`,
};

// Helper: Authenticate user and check limits
async function authenticateAndCheckLimits(req: Request, t: typeof translations.nl): Promise<{ user: any; supabase: any; aiSubjectId: string } | Response> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized', message: t.unauthorized }), {
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
    return new Response(JSON.stringify({ error: 'Unauthorized', message: t.unauthorized }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const aiSubjectId = generateAISubjectId(user.id);

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
      message: t.limitExceeded
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
    const { description, imageBase64, hasAIConsent, mealTime, language } = await req.json();
    
    const lang = getLanguage(language);
    const t = translations[lang];
    const foodParsingPrompt = foodParsingPrompts[lang];

    // Authenticate and check limits
    const authResult = await authenticateAndCheckLimits(req, t);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user, supabase, aiSubjectId } = authResult;
    
    // CONSENT CHECK
    if (hasAIConsent === false) {
      const { data: consent } = await supabase
        .from('user_consents')
        .select('accepted_ai_processing')
        .eq('owner_id', user.id)
        .single();

      if (!consent?.accepted_ai_processing) {
        return new Response(JSON.stringify({
          error: 'consent_required',
          message: t.consentRequired,
          description: description || t.mealLabel,
          items: [],
          totals: { kcal: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null },
          ultra_processed_level: null,
          confidence: 'low',
          verification_questions: [],
          quality_flags: {},
          notes: t.manualInput
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    const OPENAI_API_KEY = Deno.env.get('ChatGPT');
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      throw new Error('AI service is niet geconfigureerd');
    }

    const scrubbedDescription = description ? scrubPII(description) : null;

    const userContent: any[] = [];
    const analyzeText = lang === 'en' ? 'Analyze this meal:' : 'Analyseer deze maaltijd:';
    const photoText = lang === 'en' ? 'Analyze this meal in the photo.' : 'Analyseer deze maaltijd op de foto.';
    
    if (scrubbedDescription) {
      userContent.push({
        type: 'text',
        text: `${analyzeText} ${scrubbedDescription}`
      });
    }
    
    if (imageBase64) {
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
          text: photoText
        });
      }
    }

    if (userContent.length === 0) {
      throw new Error(t.noDescription);
    }

    await trackUsage(supabase, user.id, 'analyze-meal');

    console.log('Analyzing meal via OpenAI API, subject:', aiSubjectId, 'language:', lang);
    
    let analysis;
    let usedFallback = false;
    
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

    const tokensUsed = { prompt: 0, completion: 0 };
    const costEur = { mini: 0, full: 0, total: 0 };

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit',
          message: t.rateLimit
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI service unavailable');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (aiData.usage) {
      tokensUsed.prompt += aiData.usage.prompt_tokens || 0;
      tokensUsed.completion += aiData.usage.completion_tokens || 0;
      costEur.mini = ((tokensUsed.prompt * 0.15 + tokensUsed.completion * 0.60) / 1000000) * 0.93;
    }
    
    console.log('Meal analysis received for subject:', aiSubjectId);

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
      
      const confidenceNum = typeof analysis.confidence === 'number' ? analysis.confidence : 0.5;
      if (imageBase64 && confidenceNum < 0.65 && !usedFallback) {
        console.log(`Low confidence (${confidenceNum}) for photo analysis, escalating to gpt-4o for subject:`, aiSubjectId);
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
          
          if (fallbackData.usage) {
            tokensUsed.prompt += fallbackData.usage.prompt_tokens || 0;
            tokensUsed.completion += fallbackData.usage.completion_tokens || 0;
            costEur.full = ((fallbackData.usage.prompt_tokens * 2.50 + fallbackData.usage.completion_tokens * 10) / 1000000) * 0.93;
          }
          
          try {
            const jsonMatch = fallbackContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const fallbackAnalysis = JSON.parse(jsonMatch[0]);
              if (typeof fallbackAnalysis.confidence === 'number' && fallbackAnalysis.confidence > confidenceNum) {
                analysis = fallbackAnalysis;
                console.log(`Fallback improved confidence: ${confidenceNum} → ${fallbackAnalysis.confidence}`);
              }
            }
          } catch {
            console.log('Fallback parsing failed, keeping original analysis');
          }
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response for', aiSubjectId);
      
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
          description: description || t.mealLabel,
          items: [],
          totals: { kcal: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null },
          ultra_processed_level: null,
          confidence: 0.3,
          verification_questions: [{
            question: t.fallbackQuestion,
            options: [t.optionBreakfast, t.optionWarm, t.optionSnack, t.optionDrink],
            affects: 'description'
          }],
          quality_flags: {},
          notes: t.fallbackNote
        };
      }
    }

    analysis.model_used = usedFallback ? 'gpt-4o' : 'gpt-4o-mini';
    costEur.total = costEur.mini + costEur.full;
    analysis.tokens_used = tokensUsed.prompt + tokensUsed.completion;
    analysis.cost_eur = Math.round(costEur.total * 10000) / 10000;

    if (mealTime) {
      const hour = parseInt(mealTime.split(':')[0], 10);
      if (analysis.quality_flags) {
        analysis.quality_flags.is_late_meal = hour >= 21;
      }
    }

    if (!analysis.totals && analysis.kcal !== undefined) {
      analysis.totals = {
        kcal: analysis.kcal,
        protein_g: analysis.protein_g,
        carbs_g: analysis.carbs_g,
        fat_g: analysis.fat_g,
        fiber_g: analysis.fiber_g
      };
    }
    
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
