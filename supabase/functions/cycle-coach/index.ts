import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_AI_LIMIT = 30;

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

// COMPLIANCE SYSTEM PROMPT - MDR-proof, niet-medische output
const systemPrompt = `ROL & KADER

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

Als de input onvoldoende is, geef generieke, ondersteunende observaties.`;

// Helper: anonimiseer data - ALLEEN statistieken, geen herleidbare info
function anonymizeData(input: {
  cycles?: any[];
  bleedingLogs?: any[];
  symptomLogs?: any[];
  preferences?: any;
  baselinePrediction?: any;
  hasAIConsent?: boolean;
}) {
  const { cycles, bleedingLogs, symptomLogs, preferences, baselinePrediction } = input;
  
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
  const variabilityCategory = cycleVariability === null ? 'onbekend' 
    : cycleVariability <= 3 ? 'regelmatig'
    : cycleVariability <= 7 ? 'licht wisselend'
    : 'wisselend';

  // Tel symptomen - alleen frequentiecategorieën
  const symptomCounts: Record<string, string> = {};
  const symptoms = ['headache', 'bloating', 'anxiety', 'irritability', 'breast_tender', 'hot_flashes'];
  symptoms.forEach(s => {
    const count = (symptomLogs || []).filter((log: any) => log[s]).length;
    symptomCounts[s] = count === 0 ? 'niet gelogd' 
      : count <= 3 ? 'incidenteel' 
      : count <= 7 ? 'regelmatig' 
      : 'frequent';
  });

  // Bloedingspatroon - categorisch
  const bleedingCount = (bleedingLogs || []).length;
  const bleedingCategory = bleedingCount === 0 ? 'geen data'
    : bleedingCount <= 3 ? 'weinig dagen'
    : bleedingCount <= 7 ? 'gemiddeld'
    : 'veel dagen';
  
  return {
    stats: {
      avgCycleLengthCategory: avgCycleLength === null ? 'onbekend'
        : avgCycleLength < 25 ? 'kort'
        : avgCycleLength <= 35 ? 'gemiddeld'
        : 'lang',
      variabilityCategory,
      dataVolume: cycleLengths.length === 0 ? 'geen'
        : cycleLengths.length <= 2 ? 'beperkt'
        : 'voldoende',
      symptomPatterns: symptomCounts,
      bleedingCategory,
    },
    profile: {
      perimenopauze: preferences?.perimenopause ? 'ja' : 'onbekend',
      hormonaleAnticonceptie: preferences?.hormonal_contraception ? 'ja' : 'nee',
    },
    currentPhase: {
      phase: baselinePrediction?.current_phase || 'unknown',
      season: baselinePrediction?.current_season || 'unknown',
    }
  };
}

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

    const inputData = await req.json();
    
    // CONSENT CHECK - verify consent server-side
    const { data: consent } = await supabase
      .from('user_consents')
      .select('accepted_ai_processing')
      .eq('owner_id', user.id)
      .single();

    if (!inputData.hasAIConsent || !consent?.accepted_ai_processing) {
      return new Response(JSON.stringify({
        error: 'consent_required',
        message: 'Om deze functie te gebruiken is toestemming nodig voor het verwerken van gezondheidsgegevens en AI-ondersteuning.',
        seasonNow: inputData.baselinePrediction?.current_season || 'onbekend',
        phaseNow: inputData.baselinePrediction?.current_phase || 'onbekend',
        confidence: 0,
        confidenceExplanation: 'Geen AI-analyse zonder toestemming.',
        todayTips: {
          voedingTip: 'Schakel AI-ondersteuning in bij Instellingen voor gepersonaliseerde tips.',
          trainingTip: 'Luister naar je lichaam en beweeg op een manier die goed voelt.',
          werkTip: 'Plan je dag flexibel en neem voldoende pauzes.',
          herstelTip: 'Rust is belangrijk. Gun jezelf momenten van ontspanning.',
        },
        watchouts: [],
        insight: 'Schakel AI in bij Instellingen voor persoonlijke inzichten.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Use Lovable AI Gateway (no direct OpenAI calls)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // PRIVACY: Anonimiseer naar categorieën, geen exacte waarden
    const anonymized = anonymizeData(inputData);
    
    // Track usage BEFORE making the AI call
    await trackUsage(supabase, user.id, 'cycle-coach');

    console.log('Generating cycle coach insight via Lovable AI, subject:', aiSubjectId);

    // Context met ALLEEN categorische kenmerken (geen PII, geen exacte waarden)
    const context = `
GEANONIMISEERDE KENMERKEN (geen exacte waarden, geen persoonsgegevens):

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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context }
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
        seasonNow: anonymized.currentPhase.season || 'onbekend',
        phaseNow: anonymized.currentPhase.phase || 'onbekend',
        confidence: 50,
        confidenceExplanation: 'Gebaseerd op beperkte gegevens.',
        todayTips: {
          voedingTip: 'Gevarieerd eten met voldoende eiwit en groenten kan je energie ondersteunen.',
          trainingTip: 'Luister naar je lichaam en beweeg op een manier die goed voelt.',
          werkTip: 'Neem regelmatig pauzes en plan je energie flexibel in.',
          herstelTip: 'Rust en ontspanning zijn belangrijk voor je welzijn.',
        },
        watchouts: [],
        insight: 'Log meer dagen om patronen zichtbaar te maken. Deze app geeft geen medisch advies.',
      };
    }

    // Voeg altijd disclaimer toe
    result.disclaimer = 'Deze inzichten zijn informatief en geen medisch advies. Raadpleeg bij klachten altijd een zorgverlener.';

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
