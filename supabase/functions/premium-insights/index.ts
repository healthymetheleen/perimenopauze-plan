import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient, User } from "npm:@supabase/supabase-js@2";
import { getPrompts, type SupportedLanguage } from "../_shared/prompts.ts";

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

// GLOBAL AI GUARDRAIL - MDR-compliant system prompts (fallbacks)
const fallbackSystemPrompts = {
  nl: {
    base: `ROL & KADER

Je bent een ondersteunende reflectie-assistent voor vrouwen in de perimenopauze.
Je bent GEEN arts, GEEN therapeut en GEEN medisch hulpmiddel.

Je werkt uitsluitend met:
• geanonimiseerde patronen
• subjectieve beleving
• leefstijl- en cyclusinformatie

Je mag NOOIT:
• medische diagnoses stellen
• medische verklaringen geven
• oorzakelijke claims maken
• voorspellingen doen
• behandel- of therapieadvies geven
• woorden gebruiken als "symptomen", "behandeling", "therapie"

Je taak is:
• patronen beschrijven
• samenhang zichtbaar maken
• ervaringen normaliseren
• uitnodigen tot zelfobservatie
• hormoonschommelingen educatief beschrijven (geen diagnose)

Taalregels:
• Nederlands
• warm, rustig, niet-oordelend
• beschrijvend, nooit voorschrijvend
• gebruik woorden als: "valt op", "lijkt samen te gaan met", "veel vrouwen ervaren", "het kan interessant zijn om"
• vermijd: "dit betekent", "dit veroorzaakt", "je moet", "advies"

CYCLUS ALS METAFOOR (niet medisch):
• menstruatie = winter (rust, herstel) - oestrogeen en progesteron zijn laag
• folliculair = lente (groei, energie) - oestrogeen stijgt, FSH actief
• ovulatie = zomer (piek, verbinding) - oestrogeen piekt, LH stijgt
• luteaal = herfst (reflectie, afronding) - progesteron stijgt, oestrogeen daalt

HORMOONCONTEXT (educatief, geen diagnose):
• Oestrogeen: beïnvloedt stemming, energie, slaapkwaliteit, huid
• Progesteron: kalmerend effect, beïnvloedt slaap en angstgevoelens
• FSH/LH: reguleren cyclus, kunnen wisselen in perimenopauze
• Cortisol: stresshormoon, interactie met andere hormonen`,
    daily: `SPECIFIEKE TAAK: Dagelijkse reflectie

Je ontvangt dagkenmerken van één dag (geanonimiseerd, geen persoonlijke identificatoren).

STRUCTUUR OUTPUT (JSON):
{
  "pattern": "1 opvallend patroon van vandaag (max 1 zin)",
  "context": "bredere context - veel vrouwen herkennen dit (max 2 zinnen)",
  "hormoneContext": "kort welke hormonen mogelijk een rol spelen in deze fase (max 1 zin, educatief)",
  "reflection": "1 zachte reflectievraag (geen waarom-vraag)"
}

REGELS:
• Max 100 woorden totaal
• Geen advies
• Geen oorzaak-gevolg als medische claim
• Focus op wat samen voorkomt
• Hormooninfo is educatief, niet diagnostisch`,
    weekly: `SPECIFIEKE TAAK: Weekanalyse

Je ontvangt samengevatte weekpatronen (geanonimiseerd).

STRUCTUUR OUTPUT (JSON):
{
  "theme": "1 terugkerend thema (max 1 zin)",
  "variation": "1 variatie of verandering t.o.v. eerder (max 1 zin)",
  "hormoneInsight": "hoe hormoonschommelingen deze patronen kunnen beïnvloeden (max 2 zinnen, educatief)",
  "normalization": "normaliseer onregelmatigheid - dit hoort bij perimenopauze (max 2 zinnen)",
  "insight": "1 inzichtzin (geen actie)"
}

REGELS:
• Max 140 woorden totaal
• Geen oordeel
• Geen optimalisatie-taal
• Focus op verloop en samenhang
• Hormooninfo is educatief`,
    sleep: `SPECIFIEKE TAAK: Slaap-inzicht

Je beschrijft slaap als BELEVING, niet als meting.

STRUCTUUR OUTPUT (JSON):
{
  "sleepPattern": "hoe slaap aanvoelde over meerdere dagen (max 2 zinnen)",
  "hormoneConnection": "hoe hormonen slaap kunnen beïnvloeden in deze fase (max 2 zinnen, educatief: progesteron/oestrogeen/cortisol)",
  "connection": "verband met dagbeleving indien zichtbaar (max 1 zin)",
  "normalization": "normaliseer lichte of wisselende slaap in perimenopauze (max 1 zin)",
  "cycleContext": "optioneel: verband met cyclusfase indien relevant (max 1 zin)"
}

VERMIJD:
• normen ("te weinig", "slecht")
• medische termen als diagnose
• slaapstoornissen benoemen`,
    cycle: `SPECIFIEKE TAAK: Cyclus-lens

Gebruik de cyclus als METAFOOR, niet als medische verklaring.

STRUCTUUR OUTPUT (JSON):
{
  "season": "het huidige 'seizoen' (winter/lente/zomer/herfst)",
  "hormoneProfile": "welke hormonen actief zijn in deze fase en wat dit vaak betekent voor energie/stemming (max 2 zinnen, educatief)",
  "experience": "hoe dit vaak wordt ervaren door vrouwen (max 2 zinnen)",
  "observation": "koppeling aan wat de gebruiker ziet in haar data (max 1 zin)",
  "invitation": "zachte uitnodiging tot zelfobservatie (max 1 zin)"
}

REGELS:
• Hormooninfo is educatief, niet diagnostisch
• Geen verwachtingen scheppen
• Alles is beschrijvend`,
  },
  en: {
    base: `ROLE & FRAMEWORK

You are a supportive reflection assistant for women in perimenopause.
You are NOT a doctor, NOT a therapist, and NOT a medical device.

You work exclusively with:
• anonymized patterns
• subjective experience
• lifestyle and cycle information

You may NEVER:
• make medical diagnoses
• provide medical explanations
• make causal claims
• make predictions
• give treatment or therapy advice
• use words like "symptoms", "treatment", "therapy"

Your task is:
• describe patterns
• make connections visible
• normalize experiences
• invite self-observation
• describe hormone fluctuations educationally (no diagnosis)

Language rules:
• English
• warm, calm, non-judgmental
• descriptive, never prescriptive
• use words like: "it stands out", "seems to go together with", "many women experience", "it might be interesting to"
• avoid: "this means", "this causes", "you should", "advice"

CYCLE AS METAPHOR (not medical):
• menstruation = winter (rest, recovery) - estrogen and progesterone are low
• follicular = spring (growth, energy) - estrogen rises, FSH active
• ovulation = summer (peak, connection) - estrogen peaks, LH rises
• luteal = autumn (reflection, completion) - progesterone rises, estrogen falls

HORMONE CONTEXT (educational, no diagnosis):
• Estrogen: affects mood, energy, sleep quality, skin
• Progesterone: calming effect, affects sleep and anxiety
• FSH/LH: regulate cycle, can fluctuate in perimenopause
• Cortisol: stress hormone, interacts with other hormones`,
    daily: `SPECIFIC TASK: Daily reflection

You receive day characteristics from one day (anonymized, no personal identifiers).

OUTPUT STRUCTURE (JSON):
{
  "pattern": "1 notable pattern from today (max 1 sentence)",
  "context": "broader context - many women recognize this (max 2 sentences)",
  "hormoneContext": "briefly which hormones may play a role in this phase (max 1 sentence, educational)",
  "reflection": "1 gentle reflection question (not a why-question)"
}

RULES:
• Max 100 words total
• No advice
• No cause-effect as medical claim
• Focus on what occurs together
• Hormone info is educational, not diagnostic`,
    weekly: `SPECIFIC TASK: Weekly analysis

You receive summarized weekly patterns (anonymized).

OUTPUT STRUCTURE (JSON):
{
  "theme": "1 recurring theme (max 1 sentence)",
  "variation": "1 variation or change compared to before (max 1 sentence)",
  "hormoneInsight": "how hormone fluctuations can influence these patterns (max 2 sentences, educational)",
  "normalization": "normalize irregularity - this is part of perimenopause (max 2 sentences)",
  "insight": "1 insight sentence (no action)"
}

RULES:
• Max 140 words total
• No judgment
• No optimization language
• Focus on progression and connection
• Hormone info is educational`,
    sleep: `SPECIFIC TASK: Sleep insight

You describe sleep as EXPERIENCE, not as measurement.

OUTPUT STRUCTURE (JSON):
{
  "sleepPattern": "how sleep felt over several days (max 2 sentences)",
  "hormoneConnection": "how hormones can influence sleep in this phase (max 2 sentences, educational: progesterone/estrogen/cortisol)",
  "connection": "connection with daily experience if visible (max 1 sentence)",
  "normalization": "normalize light or varying sleep in perimenopause (max 1 sentence)",
  "cycleContext": "optional: connection with cycle phase if relevant (max 1 sentence)"
}

AVOID:
• norms ("too little", "bad")
• medical terms as diagnosis
• naming sleep disorders`,
    cycle: `SPECIFIC TASK: Cycle lens

Use the cycle as METAPHOR, not as medical explanation.

OUTPUT STRUCTURE (JSON):
{
  "season": "the current 'season' (winter/spring/summer/autumn)",
  "hormoneProfile": "which hormones are active in this phase and what this often means for energy/mood (max 2 sentences, educational)",
  "experience": "how this is often experienced by women (max 2 sentences)",
  "observation": "connection to what the user sees in her data (max 1 sentence)",
  "invitation": "gentle invitation to self-observation (max 1 sentence)"
}

RULES:
• Hormone info is educational, not diagnostic
• Don't create expectations
• Everything is descriptive`,
  },
};

// Helper to get fallback prompt for type
function getFallbackPrompt(type: string, lang: SupportedLanguage): string {
  const prompts = fallbackSystemPrompts[lang];
  switch (type) {
    case 'daily': return `${prompts.base}\n\n${prompts.daily}`;
    case 'weekly': return `${prompts.base}\n\n${prompts.weekly}`;
    case 'sleep': return `${prompts.base}\n\n${prompts.sleep}`;
    case 'cycle': return `${prompts.base}\n\n${prompts.cycle}`;
    default: return `${prompts.base}\n\n${prompts.daily}`;
  }
}

// Dynamic prompt fetcher for type
async function getDynamicPromptForType(type: string, lang: SupportedLanguage): Promise<string> {
  const promptKeys = ['premium_insights_base', `premium_insights_${type}`];
  const fallbacks: Record<string, string> = {
    'premium_insights_base': fallbackSystemPrompts[lang].base,
    [`premium_insights_${type}`]: fallbackSystemPrompts[lang][type as keyof typeof fallbackSystemPrompts.nl] || fallbackSystemPrompts[lang].daily,
  };
  
  const prompts = await getPrompts(promptKeys, lang, fallbacks);
  return `${prompts['premium_insights_base']}\n\n${prompts[`premium_insights_${type}`]}`;
}

const translations = {
  nl: {
    disclaimer: 'Deze inzichten zijn informatief en geen medisch advies.',
    consentRequired: 'Om AI-inzichten te ontvangen is toestemming nodig.',
    limitExceeded: (limit: number) => `Dagelijkse AI-limiet (${limit}) bereikt. Probeer het morgen opnieuw.`,
    rateLimit: 'Te veel verzoeken. Probeer het later opnieuw.',
    serviceError: 'Er ging iets mis bij het genereren van inzichten. Probeer het later opnieuw.',
    aiNotConfigured: 'AI-service is niet geconfigureerd.',
    defaultResponses: {
      daily: {
        pattern: "Op basis van je gegevens is er nog geen duidelijk patroon zichtbaar.",
        context: "Dit is normaal, vooral in de perimenopauze waar variatie de norm is.",
        hormoneContext: "Hormoonschommelingen kunnen dag tot dag variëren.",
        reflection: "Wat viel jou zelf het meest op aan vandaag?"
      },
      weekly: {
        theme: "Deze week laat nog geen duidelijk thema zien.",
        variation: "Er is variatie, wat past bij deze levensfase.",
        hormoneInsight: "In de perimenopauze kunnen oestrogeen en progesteron wisselen, wat invloed heeft op energie en stemming.",
        normalization: "Veel vrouwen ervaren wisselende patronen van week tot week.",
        insight: "Log meer dagen om terugkerende thema's zichtbaar te maken."
      },
      sleep: {
        sleepPattern: "Je slaappatroon laat variatie zien over de afgelopen dagen.",
        hormoneConnection: "Progesteron heeft een kalmerend effect op slaap; wisselingen kunnen slaapkwaliteit beïnvloeden.",
        connection: "De samenhang met je dagbeleving wordt duidelijker met meer data.",
        normalization: "Veel vrouwen in de perimenopauze ervaren dat slaap wisselt.",
        cycleContext: ""
      },
      cycle: {
        season: "onbekend",
        hormoneProfile: "Elke fase kent eigen hormoonpatronen die energie en stemming beïnvloeden.",
        experience: "In elke fase van je cyclus kan je lichaam anders reageren.",
        observation: "Log meer data om verbanden met je cyclus te zien.",
        invitation: "Merk op hoe je je vandaag voelt."
      },
    },
    contextLabels: {
      meals: 'Eetmomenten',
      sleep: 'Slaapbeleving',
      stress: 'Stressbeleving',
      cycleSeason: 'Cyclusfase/seizoen',
      movement: 'Beweging',
      energy: 'Energieniveau',
      unknown: 'onbekend',
      avgDuration: 'Gemiddelde duur',
      quality: 'Kwaliteitsbeleving',
      consistency: 'Consistentie',
      interruptions: 'Onderbrekingen',
      season: 'Huidig seizoen',
      phase: 'Huidige fase',
    },
  },
  en: {
    disclaimer: 'These insights are informational and not medical advice.',
    consentRequired: 'Consent is required to receive AI insights.',
    limitExceeded: (limit: number) => `Daily AI limit (${limit}) reached. Please try again tomorrow.`,
    rateLimit: 'Too many requests. Please try again later.',
    serviceError: 'Something went wrong while generating insights. Please try again later.',
    aiNotConfigured: 'AI service is not configured.',
    defaultResponses: {
      daily: {
        pattern: "Based on your data, no clear pattern is visible yet.",
        context: "This is normal, especially in perimenopause where variation is the norm.",
        hormoneContext: "Hormone fluctuations can vary from day to day.",
        reflection: "What stood out most to you about today?"
      },
      weekly: {
        theme: "This week doesn't show a clear theme yet.",
        variation: "There is variation, which fits this life phase.",
        hormoneInsight: "In perimenopause, estrogen and progesterone can fluctuate, affecting energy and mood.",
        normalization: "Many women experience varying patterns from week to week.",
        insight: "Log more days to reveal recurring themes."
      },
      sleep: {
        sleepPattern: "Your sleep pattern shows variation over the past days.",
        hormoneConnection: "Progesterone has a calming effect on sleep; fluctuations can affect sleep quality.",
        connection: "The connection with your daily experience becomes clearer with more data.",
        normalization: "Many women in perimenopause experience varying sleep.",
        cycleContext: ""
      },
      cycle: {
        season: "unknown",
        hormoneProfile: "Each phase has its own hormone patterns that affect energy and mood.",
        experience: "In each phase of your cycle, your body can react differently.",
        observation: "Log more data to see connections with your cycle.",
        invitation: "Notice how you feel today."
      },
    },
    contextLabels: {
      meals: 'Meals',
      sleep: 'Sleep experience',
      stress: 'Stress level',
      cycleSeason: 'Cycle phase/season',
      movement: 'Movement',
      energy: 'Energy level',
      unknown: 'unknown',
      avgDuration: 'Average duration',
      quality: 'Quality experience',
      consistency: 'Consistency',
      interruptions: 'Interruptions',
      season: 'Current season',
      phase: 'Current phase',
    },
  },
};

// Kept for backwards compatibility, but getDynamicPromptForType is preferred
function getPromptForType(type: string, lang: SupportedLanguage): string {
  return getFallbackPrompt(type, lang);
}

function getDefaultResponse(type: string, lang: SupportedLanguage): object {
  return translations[lang].defaultResponses[type as keyof typeof translations.nl.defaultResponses] || {};
}

// Helper: Authenticate user and check limits
async function authenticateAndCheckLimits(req: Request, lang: SupportedLanguage): Promise<{ user: User; supabase: SupabaseClient; aiSubjectId: string } | Response> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized', message: translations[lang].consentRequired }), {
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
      message: translations[lang].limitExceeded(DAILY_AI_LIMIT)
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

// Helper: Generate hash of input data
function hashData(data: object): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data, hasAIConsent, forceRefresh, language } = await req.json();
    const lang = getLanguage(language);
    const t = translations[lang];
    const labels = t.contextLabels;

    // Authenticate and check limits
    const authResult = await authenticateAndCheckLimits(req, lang);
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

    if (!hasAIConsent || !consent?.accepted_ai_processing) {
      return new Response(JSON.stringify({
        error: 'consent_required',
        message: t.consentRequired,
        ...getDefaultResponse(type, lang)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const inputHash = hashData({ ...data, lang });

    // CHECK CACHE FIRST - insights are cached for 1 day
    if (!forceRefresh) {
      const { data: cachedInsight } = await supabase
        .from('ai_insights_cache')
        .select('insight_data, input_hash')
        .eq('owner_id', user.id)
        .eq('insight_type', `${type}_${lang}`)
        .eq('insight_date', today)
        .single();

      if (cachedInsight && cachedInsight.input_hash === inputHash) {
        console.log(`Returning cached ${type} insight (${lang}) for subject ${aiSubjectId}`);
        return new Response(JSON.stringify({
          ...cachedInsight.insight_data,
          cached: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Use direct OpenAI API for full control and GDPR compliance
    const OPENAI_API_KEY = Deno.env.get('ChatGPT');
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({
        error: 'ai_not_configured',
        ...getDefaultResponse(type, lang)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch dynamic system prompt from database
    const systemPromptForType = await getDynamicPromptForType(type, lang);
    
    // Build MINIMAL context - only categorical data, no PII
    let context = '';
    
    if (type === 'daily') {
      context = lang === 'nl' 
        ? `DAGKENMERKEN (geanonimiseerd):
- ${labels.meals}: ${data.mealsCount || labels.unknown}
- ${labels.sleep}: ${data.sleepQuality || labels.unknown}
- ${labels.stress}: ${data.stressLevel || labels.unknown}
- ${labels.cycleSeason}: ${data.cycleSeason || labels.unknown}
- ${labels.movement}: ${data.movement || labels.unknown}
- ${labels.energy}: ${data.energy || labels.unknown}

Geef een reflectie op basis van deze dagkenmerken.`
        : `DAY CHARACTERISTICS (anonymized):
- ${labels.meals}: ${data.mealsCount || labels.unknown}
- ${labels.sleep}: ${data.sleepQuality || labels.unknown}
- ${labels.stress}: ${data.stressLevel || labels.unknown}
- ${labels.cycleSeason}: ${data.cycleSeason || labels.unknown}
- ${labels.movement}: ${data.movement || labels.unknown}
- ${labels.energy}: ${data.energy || labels.unknown}

Provide a reflection based on these day characteristics.`;
    } else if (type === 'weekly') {
      context = lang === 'nl'
        ? `WEEKPATRONEN (laatste 7-14 dagen, geanonimiseerd):
${JSON.stringify(data.patterns || {}, null, 2)}

Geef een weekanalyse op basis van deze patronen.`
        : `WEEKLY PATTERNS (last 7-14 days, anonymized):
${JSON.stringify(data.patterns || {}, null, 2)}

Provide a weekly analysis based on these patterns.`;
    } else if (type === 'sleep') {
      context = lang === 'nl'
        ? `SLAAPGEGEVENS (geanonimiseerd):
- ${labels.avgDuration}: ${data.avgDuration || labels.unknown}
- ${labels.quality}: ${data.avgQuality || labels.unknown}
- ${labels.consistency}: ${data.consistency || labels.unknown}
- ${labels.interruptions}: ${data.interruptions || labels.unknown}
- ${labels.cycleSeason}: ${data.cycleSeason || labels.unknown}

Geef een slaap-inzicht op basis van deze gegevens.`
        : `SLEEP DATA (anonymized):
- ${labels.avgDuration}: ${data.avgDuration || labels.unknown}
- ${labels.quality}: ${data.avgQuality || labels.unknown}
- ${labels.consistency}: ${data.consistency || labels.unknown}
- ${labels.interruptions}: ${data.interruptions || labels.unknown}
- ${labels.cycleSeason}: ${data.cycleSeason || labels.unknown}

Provide a sleep insight based on this data.`;
    } else if (type === 'cycle') {
      context = lang === 'nl'
        ? `CYCLUSGEGEVENS (geanonimiseerd):
- ${labels.season}: ${data.season || labels.unknown}
- ${labels.phase}: ${data.phase || labels.unknown}
- ${labels.energy}: ${data.energy || labels.unknown}
- ${labels.stress}: ${data.stress || labels.unknown}

Geef een cyclus-lens inzicht.`
        : `CYCLE DATA (anonymized):
- ${labels.season}: ${data.season || labels.unknown}
- ${labels.phase}: ${data.phase || labels.unknown}
- ${labels.energy}: ${data.energy || labels.unknown}
- ${labels.stress}: ${data.stress || labels.unknown}

Provide a cycle lens insight.`;
    }

    // Track usage BEFORE making the AI call
    await trackUsage(supabase, user.id, `premium-insights-${type}`);

    console.log(`Generating ${type} insight (${lang}) via OpenAI API, subject: ${aiSubjectId}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPromptForType },
          { role: 'user', content: context }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit',
          message: t.rateLimit,
          ...getDefaultResponse(type, lang)
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI service unavailable');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    console.log(`${type} insight (${lang}) generated for subject ${aiSubjectId}`);

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
      result = getDefaultResponse(type, lang);
    }

    // Add disclaimer
    result.disclaimer = t.disclaimer;

    // CACHE THE RESULT
    const { error: cacheError } = await supabase
      .from('ai_insights_cache')
      .upsert({
        owner_id: user.id,
        insight_type: `${type}_${lang}`,
        insight_date: today,
        insight_data: result,
        input_hash: inputHash,
      }, {
        onConflict: 'owner_id,insight_type,insight_date'
      });

    if (cacheError) {
      console.error('Failed to cache insight:', cacheError);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in premium-insights:', error);
    return new Response(JSON.stringify({ 
      error: 'service_error',
      message: 'Something went wrong while generating insights. Please try again later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
