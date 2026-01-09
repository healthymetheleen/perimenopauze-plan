import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient, User } from "npm:@supabase/supabase-js@2";
import { getPrompt, type SupportedLanguage } from "../_shared/prompts.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_AI_LIMIT = 30;

function getLanguage(lang?: string): SupportedLanguage {
  if (lang === 'en') return 'en';
  return 'nl';
}

// Privacy: generate AI subject ID
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

// Fallback prompts for when database is unavailable
const fallbackPrompts = {
  nl: {
    system: `ROL & KADER

Je bent een ondersteunende reflectie-assistent voor vrouwen in de perimenopauze.
Je bent GEEN arts, GEEN therapeut en GEEN medisch hulpmiddel.

Je werkt uitsluitend met:
• geanonimiseerde patronen
• subjectieve beleving
• leefstijl- en cyclusinformatie

Je mag NOOIT:
• medische diagnoses stellen
• medische verklaringen geven
• oorzakelijke claims maken ("dit veroorzaakt", "door hormonen")
• voorspellingen doen over gezondheid
• behandel- of therapieadvies geven
• hormoonwaarden of ziektebeelden benoemen
• woorden gebruiken als "symptomen", "behandeling", "therapie"

Je taak is:
• patronen beschrijven (wat samen voorkomt)
• samenhang zichtbaar maken
• ervaringen normaliseren
• uitnodigen tot zelfobservatie

Taalregels:
• Nederlands, warm, rustig, niet-oordelend
• Gebruik: "valt op", "lijkt samen te gaan met", "veel vrouwen ervaren", "het kan interessant zijn om"
• Vermijd: "dit betekent", "dit veroorzaakt", "je moet", "advies"

CYCLUS ALS METAFOOR (niet medisch):
• menstruatie = winter (rust, herstel)
• folliculair = lente (groei, energie)
• ovulatie = zomer (piek, verbinding)
• luteaal = herfst (reflectie, afronding)

OUTPUTREGELS:
• Maximaal 120 woorden totaal
• Geen diagnoses of conclusies
• Geen exacte getallen herhalen

Geef output ALLEEN als valide JSON in dit formaat:
{
  "seasonNow": "winter" | "lente" | "zomer" | "herfst",
  "phaseNow": "menstruatie" | "folliculair" | "ovulatie" | "luteaal",
  "confidence": 0-100,
  "confidenceExplanation": "1 korte zin met voorzichtige taal",
  "todayTips": {
    "voedingTip": "1 zin, beschrijvend, geen advies",
    "trainingTip": "1 zin, uitnodigend",
    "werkTip": "1 zin over energie/focus",
    "herstelTip": "1 zin over rust"
  },
  "watchouts": ["max 2 observaties, geen diagnoses"],
  "insight": "1 patroon, voorzichtige taal"
}

Als de input onvoldoende is, geef generieke, ondersteunende observaties.`,
    disclaimer: 'Deze inzichten zijn informatief en geen medisch advies. Raadpleeg bij klachten altijd een zorgverlener.',
    limitExceeded: (limit: number) => `Dagelijkse AI-limiet (${limit}) bereikt. Probeer het morgen opnieuw.`,
    rateLimit: 'Te veel verzoeken. Probeer het later opnieuw.',
    serviceError: 'Er ging iets mis. Probeer het later opnieuw.',
    consentFallback: {
      voedingTip: 'Schakel AI-ondersteuning in bij Instellingen voor gepersonaliseerde tips.',
      trainingTip: 'Luister naar je lichaam en beweeg op een manier die goed voelt.',
      werkTip: 'Plan je dag flexibel en neem voldoende pauzes.',
      herstelTip: 'Rust is belangrijk. Gun jezelf momenten van ontspanning.',
      insight: 'Schakel AI in bij Instellingen voor persoonlijke inzichten.',
    },
    fallback: {
      confidenceExplanation: 'Gebaseerd op beperkte gegevens.',
      voedingTip: 'Gevarieerd eten met voldoende eiwit en groenten kan je energie ondersteunen.',
      trainingTip: 'Luister naar je lichaam en beweeg op een manier die goed voelt.',
      werkTip: 'Neem regelmatig pauzes en plan je energie flexibel in.',
      herstelTip: 'Rust en ontspanning zijn belangrijk voor je welzijn.',
      insight: 'Log meer dagen om patronen zichtbaar te maken. Deze app geeft geen medisch advies.',
    },
  },
  en: {
    system: `ROLE & FRAMEWORK

You are a supportive reflection assistant for women in perimenopause.
You are NOT a doctor, NOT a therapist, and NOT a medical device.

You work exclusively with:
• anonymized patterns
• subjective experience
• lifestyle and cycle information

You may NEVER:
• make medical diagnoses
• give medical explanations
• make causal claims ("this causes", "due to hormones")
• make predictions about health
• give treatment or therapy advice
• name hormone values or disease patterns
• use words like "symptoms", "treatment", "therapy"

Your task is:
• describe patterns (what occurs together)
• make connections visible
• normalize experiences
• invite self-observation

Language rules:
• English, warm, calm, non-judgmental
• Use: "notable", "seems to go together with", "many women experience", "it may be interesting to"
• Avoid: "this means", "this causes", "you must", "advice"

CYCLE AS METAPHOR (not medical):
• menstruation = winter (rest, recovery)
• follicular = spring (growth, energy)
• ovulation = summer (peak, connection)
• luteal = autumn (reflection, completion)

OUTPUT RULES:
• Maximum 120 words total
• No diagnoses or conclusions
• Don't repeat exact numbers

Provide output ONLY as valid JSON in this format:
{
  "seasonNow": "winter" | "spring" | "summer" | "autumn",
  "phaseNow": "menstruation" | "follicular" | "ovulation" | "luteal",
  "confidence": 0-100,
  "confidenceExplanation": "1 short sentence with cautious language",
  "todayTips": {
    "voedingTip": "1 sentence, descriptive, no advice",
    "trainingTip": "1 sentence, inviting",
    "werkTip": "1 sentence about energy/focus",
    "herstelTip": "1 sentence about rest"
  },
  "watchouts": ["max 2 observations, no diagnoses"],
  "insight": "1 pattern, cautious language"
}

If input is insufficient, provide generic, supportive observations.`,
    disclaimer: 'These insights are informational and not medical advice. Always consult a healthcare provider for any concerns.',
    limitExceeded: (limit: number) => `Daily AI limit (${limit}) reached. Please try again tomorrow.`,
    rateLimit: 'Too many requests. Please try again later.',
    serviceError: 'Something went wrong. Please try again later.',
    consentFallback: {
      voedingTip: 'Enable AI support in Settings for personalized tips.',
      trainingTip: 'Listen to your body and move in a way that feels good.',
      werkTip: 'Plan your day flexibly and take sufficient breaks.',
      herstelTip: 'Rest is important. Give yourself moments of relaxation.',
      insight: 'Enable AI in Settings for personal insights.',
    },
    fallback: {
      confidenceExplanation: 'Based on limited data.',
      voedingTip: 'Varied eating with sufficient protein and vegetables can support your energy.',
      trainingTip: 'Listen to your body and move in a way that feels good.',
      werkTip: 'Take regular breaks and plan your energy flexibly.',
      herstelTip: 'Rest and relaxation are important for your wellbeing.',
      insight: 'Log more days to make patterns visible. This app does not provide medical advice.',
    },
  },
};

// Helper function to get localized texts (non-AI prompts remain hardcoded)
function getLocalizedTexts(language: SupportedLanguage) {
  return fallbackPrompts[language];
}

// Helper: anonimiseer data - ALLEEN statistieken, geen herleidbare info
function anonymizeData(input: {
  cycles?: Record<string, unknown>[];
  bleedingLogs?: Record<string, unknown>[];
  symptomLogs?: Record<string, unknown>[];
  preferences?: Record<string, unknown>;
  baselinePrediction?: Record<string, unknown>;
  hasAIConsent?: boolean;
}, language: SupportedLanguage) {
  const { cycles, bleedingLogs, symptomLogs, preferences, baselinePrediction } = input;
  
  const labels = language === 'en'
    ? { unknown: 'unknown', regular: 'regular', slightlyVarying: 'slightly varying', varying: 'varying', short: 'short', average: 'average', long: 'long', none: 'none', limited: 'limited', sufficient: 'sufficient', notLogged: 'not logged', occasional: 'occasional', frequent: 'frequent', yes: 'yes', no: 'no', fewDays: 'few days', manyDays: 'many days', noData: 'no data' }
    : { unknown: 'onbekend', regular: 'regelmatig', slightlyVarying: 'licht wisselend', varying: 'wisselend', short: 'kort', average: 'gemiddeld', long: 'lang', none: 'geen', limited: 'beperkt', sufficient: 'voldoende', notLogged: 'niet gelogd', occasional: 'incidenteel', frequent: 'frequent', yes: 'ja', no: 'nee', fewDays: 'weinig dagen', manyDays: 'veel dagen', noData: 'geen data' };
  
  // Bereken ALLEEN samenvattende statistieken
  const cycleLengths = (cycles || [])
    .filter(c => c.computed_cycle_length)
    .map(c => c.computed_cycle_length);
  
  const avgCycleLength = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : null;
  
  // Categoriseer variabiliteit (niet exact getal)
  const cycleVariability = cycleLengths.length > 1
    ? Math.max(...cycleLengths) - Math.min(...cycleLengths)
    : null;
  const variabilityCategory = cycleVariability === null ? labels.unknown 
    : cycleVariability <= 3 ? labels.regular
    : cycleVariability <= 7 ? labels.slightlyVarying
    : labels.varying;

  // Tel symptomen - alleen frequentiecategorieën
  const symptomCounts: Record<string, string> = {};
  const symptoms = ['headache', 'bloating', 'anxiety', 'irritability', 'breast_tender', 'hot_flashes'];
  symptoms.forEach(s => {
    const count = (symptomLogs || []).filter((log: Record<string, unknown>) => log[s]).length;
    symptomCounts[s] = count === 0 ? labels.notLogged 
      : count <= 3 ? labels.occasional 
      : count <= 7 ? labels.regular 
      : labels.frequent;
  });

  // Bloedingspatroon - categorisch
  const bleedingCount = (bleedingLogs || []).length;
  const bleedingCategory = bleedingCount === 0 ? labels.noData
    : bleedingCount <= 3 ? labels.fewDays
    : bleedingCount <= 7 ? labels.average
    : labels.manyDays;
  
  return {
    stats: {
      avgCycleLengthCategory: avgCycleLength === null ? labels.unknown
        : avgCycleLength < 25 ? labels.short
        : avgCycleLength <= 35 ? labels.average
        : labels.long,
      variabilityCategory,
      dataVolume: cycleLengths.length === 0 ? labels.none
        : cycleLengths.length <= 2 ? labels.limited
        : labels.sufficient,
      symptomPatterns: symptomCounts,
      bleedingCategory,
    },
    profile: {
      perimenopauze: preferences?.perimenopause ? labels.yes : labels.unknown,
      hormonaleAnticonceptie: preferences?.hormonal_contraception ? labels.yes : labels.no,
    },
    currentPhase: {
      phase: baselinePrediction?.current_phase || 'unknown',
      season: baselinePrediction?.current_season || 'unknown',
    }
  };
}

// Helper: Authenticate user and check limits
async function authenticateAndCheckLimits(req: Request, t: typeof fallbackPrompts['nl']): Promise<{ user: User; supabase: SupabaseClient; aiSubjectId: string } | Response> {
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
      message: t.limitExceeded(DAILY_AI_LIMIT)
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return { user, supabase, aiSubjectId };
}

// Helper: Track AI usage server-side
async function trackUsage(supabase: SupabaseClient, userId: string, functionName: string) {
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
    const inputData = await req.json();
    const language = getLanguage(inputData.language);
    const t = getLocalizedTexts(language);

    // Authenticate and check limits
    const authResult = await authenticateAndCheckLimits(req, t);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user, supabase, aiSubjectId } = authResult;
    
    // CONSENT CHECK - verify consent server-side
    const { data: consent } = await supabase
      .from('user_consents')
      .select('accepted_ai_processing')
      .eq('owner_id', user.id)
      .single();

    if (!inputData.hasAIConsent || !consent?.accepted_ai_processing) {
      return new Response(JSON.stringify({
        error: 'consent_required',
        message: language === 'en' ? 'Consent is required to use this feature.' : 'Om deze functie te gebruiken is toestemming nodig.',
        seasonNow: inputData.baselinePrediction?.current_season || (language === 'en' ? 'unknown' : 'onbekend'),
        phaseNow: inputData.baselinePrediction?.current_phase || (language === 'en' ? 'unknown' : 'onbekend'),
        confidence: 0,
        confidenceExplanation: language === 'en' ? 'No AI analysis without consent.' : 'Geen AI-analyse zonder toestemming.',
        todayTips: t.consentFallback,
        watchouts: [],
        insight: t.consentFallback.insight,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Use direct OpenAI API for full control and GDPR compliance
    const OPENAI_API_KEY = Deno.env.get('ChatGPT');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    // PRIVACY: Anonimiseer naar categorieën, geen exacte waarden
    const anonymized = anonymizeData(inputData, language);
    
    // Track usage BEFORE making the AI call
    await trackUsage(supabase, user.id, 'cycle-coach');

    console.log('Generating cycle coach insight via OpenAI API, subject:', aiSubjectId);

    // Context met ALLEEN categorische kenmerken (geen PII, geen exacte waarden)
    const context = language === 'en' 
      ? `ANONYMIZED CHARACTERISTICS (no exact values, no personal data):

CYCLE PATTERN:
- Average length: ${anonymized.stats.avgCycleLengthCategory}
- Regularity: ${anonymized.stats.variabilityCategory}
- Available data: ${anonymized.stats.dataVolume}
- Bleeding pattern: ${anonymized.stats.bleedingCategory}

SYMPTOM PATTERNS (frequency, not exact counts):
${Object.entries(anonymized.stats.symptomPatterns)
  .filter(([_, v]) => v !== 'not logged')
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- No symptoms logged'}

PROFILE:
- Perimenopause: ${anonymized.profile.perimenopauze}
- Hormonal contraception: ${anonymized.profile.hormonaleAnticonceptie}

CURRENT PHASE (estimate):
- Season: ${anonymized.currentPhase.season}
- Phase: ${anonymized.currentPhase.phase}

Provide supportive, non-medical insights. Use cautious language.
Refer to a healthcare provider when in doubt.`
      : `GEANONIMISEERDE KENMERKEN (geen exacte waarden, geen persoonsgegevens):

CYCLUSPATROON:
- Gemiddelde lengte: ${anonymized.stats.avgCycleLengthCategory}
- Regelmaat: ${anonymized.stats.variabilityCategory}
- Beschikbare data: ${anonymized.stats.dataVolume}
- Bloedingspatroon: ${anonymized.stats.bleedingCategory}

SYMPTOOMPATRONEN (frequentie, niet exacte aantallen):
${Object.entries(anonymized.stats.symptomPatterns)
  .filter(([_, v]) => v !== 'niet gelogd')
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- Geen symptomen gelogd'}

PROFIEL:
- Perimenopauze: ${anonymized.profile.perimenopauze}
- Hormonale anticonceptie: ${anonymized.profile.hormonaleAnticonceptie}

HUIDIGE FASE (inschatting):
- Seizoen: ${anonymized.currentPhase.season}
- Fase: ${anonymized.currentPhase.phase}

Geef ondersteunende, niet-medische inzichten. Gebruik voorzichtige taal.
Verwijs bij twijfel naar een zorgverlener.`;

    // Fetch dynamic system prompt from database
    const systemPrompt = await getPrompt('cycle_coach_system', language, fallbackPrompts[language].system);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context }
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('Cycle coach response received for subject:', aiSubjectId);

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback met veilige, niet-medische content
      result = {
        seasonNow: anonymized.currentPhase.season || (language === 'en' ? 'unknown' : 'onbekend'),
        phaseNow: anonymized.currentPhase.phase || (language === 'en' ? 'unknown' : 'onbekend'),
        confidence: 50,
        confidenceExplanation: t.fallback.confidenceExplanation,
        todayTips: {
          voedingTip: t.fallback.voedingTip,
          trainingTip: t.fallback.trainingTip,
          werkTip: t.fallback.werkTip,
          herstelTip: t.fallback.herstelTip,
        },
        watchouts: [],
        insight: t.fallback.insight,
      };
    }

    // Voeg altijd disclaimer toe
    result.disclaimer = t.disclaimer;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cycle-coach:', error);
    return new Response(JSON.stringify({ 
      error: 'service_error',
      message: 'Er ging iets mis. Probeer het later opnieuw.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
