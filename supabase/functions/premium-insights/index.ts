import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_AI_LIMIT = 30;

// GLOBAL AI GUARDRAIL - MDR-compliant systeem prompt
const baseSystemPrompt = `ROL & KADER

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
• hormoonwaarden of ziektebeelden benoemen
• woorden gebruiken als "symptomen", "behandeling", "therapie"

Je taak is:
• patronen beschrijven
• samenhang zichtbaar maken
• ervaringen normaliseren
• uitnodigen tot zelfobservatie

Taalregels:
• Nederlands
• warm, rustig, niet-oordelend
• beschrijvend, nooit voorschrijvend
• gebruik woorden als: "valt op", "lijkt samen te gaan met", "veel vrouwen ervaren", "het kan interessant zijn om"
• vermijd: "dit betekent", "dit veroorzaakt", "je moet", "advies"

CYCLUS ALS METAFOOR (niet medisch):
• menstruatie = winter (rust, herstel)
• folliculair = lente (groei, energie)
• ovulatie = zomer (piek, verbinding)
• luteaal = herfst (reflectie, afronding)`;

// Daily reflection prompt
const dailyReflectionPrompt = `${baseSystemPrompt}

SPECIFIEKE TAAK: Dagelijkse reflectie

Je ontvangt dagkenmerken van één dag.

STRUCTUUR OUTPUT (JSON):
{
  "pattern": "1 opvallend patroon van vandaag (max 1 zin)",
  "context": "bredere context - veel vrouwen herkennen dit (max 2 zinnen)",
  "reflection": "1 zachte reflectievraag (geen waarom-vraag)"
}

REGELS:
• Max 90 woorden totaal
• Geen advies
• Geen oorzaak-gevolg
• Focus op wat samen voorkomt`;

// Weekly analysis prompt
const weeklyAnalysisPrompt = `${baseSystemPrompt}

SPECIFIEKE TAAK: Weekanalyse

Je ontvangt samengevatte weekpatronen.

STRUCTUUR OUTPUT (JSON):
{
  "theme": "1 terugkerend thema (max 1 zin)",
  "variation": "1 variatie of verandering t.o.v. eerder (max 1 zin)",
  "normalization": "normaliseer onregelmatigheid - dit hoort bij perimenopauze (max 2 zinnen)",
  "insight": "1 inzichtzin (geen actie)"
}

REGELS:
• Max 120 woorden totaal
• Geen oordeel
• Geen optimalisatie-taal
• Focus op verloop en samenhang`;

// Sleep insight prompt
const sleepInsightPrompt = `${baseSystemPrompt}

SPECIFIEKE TAAK: Slaap-inzicht

Je beschrijft slaap als BELEVING, niet als meting.

STRUCTUUR OUTPUT (JSON):
{
  "sleepPattern": "hoe slaap aanvoelde over meerdere dagen (max 2 zinnen)",
  "connection": "verband met dagbeleving indien zichtbaar (max 1 zin)",
  "normalization": "normaliseer lichte of wisselende slaap in perimenopauze (max 1 zin)",
  "cycleContext": "optioneel: verband met cyclusfase indien relevant (max 1 zin)"
}

VERMIJD:
• normen ("te weinig", "slecht")
• medische termen
• slaapstoornissen benoemen`;

// Cycle lens prompt  
const cycleLensPrompt = `${baseSystemPrompt}

SPECIFIEKE TAAK: Cyclus-lens

Gebruik de cyclus als METAFOOR, niet als medische verklaring.

STRUCTUUR OUTPUT (JSON):
{
  "season": "het huidige 'seizoen' (winter/lente/zomer/herfst)",
  "experience": "hoe dit vaak wordt ervaren door vrouwen (max 2 zinnen)",
  "observation": "koppeling aan wat de gebruiker ziet in haar data (max 1 zin)",
  "invitation": "zachte uitnodiging tot zelfobservatie (max 1 zin)"
}

REGELS:
• Geen hormoonterminologie
• Geen verwachtingen scheppen
• Alles is beschrijvend`;

function getPromptForType(type: string): string {
  switch (type) {
    case 'daily': return dailyReflectionPrompt;
    case 'weekly': return weeklyAnalysisPrompt;
    case 'sleep': return sleepInsightPrompt;
    case 'cycle': return cycleLensPrompt;
    default: return dailyReflectionPrompt;
  }
}

function getDefaultResponse(type: string): object {
  switch (type) {
    case 'daily':
      return {
        pattern: "Op basis van je gegevens is er nog geen duidelijk patroon zichtbaar.",
        context: "Dit is normaal, vooral in de perimenopauze waar variatie de norm is.",
        reflection: "Wat viel jou zelf het meest op aan vandaag?"
      };
    case 'weekly':
      return {
        theme: "Deze week laat nog geen duidelijk thema zien.",
        variation: "Er is variatie, wat past bij deze levensfase.",
        normalization: "In de perimenopauze ervaren veel vrouwen wisselende patronen van week tot week.",
        insight: "Log meer dagen om terugkerende thema's zichtbaar te maken."
      };
    case 'sleep':
      return {
        sleepPattern: "Je slaappatroon laat variatie zien over de afgelopen dagen.",
        connection: "De samenhang met je dagbeleving wordt duidelijker met meer data.",
        normalization: "Veel vrouwen in de perimenopauze ervaren dat slaap wisselt.",
        cycleContext: ""
      };
    case 'cycle':
      return {
        season: "onbekend",
        experience: "In elke fase van je cyclus kan je lichaam anders reageren.",
        observation: "Log meer data om verbanden met je cyclus te zien.",
        invitation: "Merk op hoe je je vandaag voelt."
      };
    default:
      return {};
  }
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate and check limits
    const authResult = await authenticateAndCheckLimits(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user, supabase } = authResult;

    const { type, data, hasAIConsent } = await req.json();

    // CONSENT CHECK - verify consent server-side
    const { data: consent } = await supabase
      .from('user_consents')
      .select('accepted_ai_processing')
      .eq('owner_id', user.id)
      .single();

    if (!hasAIConsent || !consent?.accepted_ai_processing) {
      return new Response(JSON.stringify({
        error: 'consent_required',
        message: 'Om AI-inzichten te ontvangen is toestemming nodig.',
        ...getDefaultResponse(type)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({
        error: 'ai_not_configured',
        ...getDefaultResponse(type)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPromptForType = getPromptForType(type);
    
    // Build context based on type
    let context = '';
    
    if (type === 'daily') {
      context = `DAGKENMERKEN:
- Eetmomenten: ${data.mealsCount || 'onbekend'}
- Slaapbeleving: ${data.sleepQuality || 'onbekend'}
- Stressbeleving: ${data.stressLevel || 'onbekend'}
- Cyclusfase/seizoen: ${data.cycleSeason || 'onbekend'}
- Beweging: ${data.movement || 'onbekend'}
- Energieniveau: ${data.energy || 'onbekend'}

Geef een reflectie op basis van deze dagkenmerken.`;
    } else if (type === 'weekly') {
      context = `WEEKPATRONEN (laatste 7-14 dagen):
${JSON.stringify(data.patterns || {}, null, 2)}

Geef een weekanalyse op basis van deze patronen.`;
    } else if (type === 'sleep') {
      context = `SLAAPGEGEVENS:
- Gemiddelde duur: ${data.avgDuration || 'onbekend'}
- Kwaliteitsbeleving: ${data.avgQuality || 'onbekend'}
- Consistentie: ${data.consistency || 'onbekend'}
- Onderbrekingen: ${data.interruptions || 'onbekend'}
- Cyclusfase: ${data.cycleSeason || 'onbekend'}

Geef een slaap-inzicht op basis van deze gegevens.`;
    } else if (type === 'cycle') {
      context = `CYCLUSGEGEVENS:
- Huidig seizoen: ${data.season || 'onbekend'}
- Huidige fase: ${data.phase || 'onbekend'}
- Energiebeleving: ${data.energy || 'onbekend'}
- Stressgevoeligheid: ${data.stress || 'onbekend'}

Geef een cyclus-lens inzicht.`;
    }

    // Track usage BEFORE making the AI call
    await trackUsage(supabase, user.id, `premium-insights-${type}`);

    console.log(`Generating ${type} insight with Lovable AI (user: ${user.id})`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPromptForType },
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
          message: 'Te veel verzoeken. Probeer het later opnieuw.',
          ...getDefaultResponse(type)
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'payment_required',
          message: 'AI-credits zijn op.',
          ...getDefaultResponse(type)
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    console.log(`${type} insight generated successfully`);

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
      result = getDefaultResponse(type);
    }

    // Add disclaimer
    result.disclaimer = 'Deze inzichten zijn informatief en geen medisch advies.';

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in premium-insights:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});