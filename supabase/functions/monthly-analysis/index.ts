import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive monthly analysis prompt with orthomolecular focus
const monthlyAnalysisPrompt = `ROL & KADER

Je bent een ondersteunende reflectie-assistent voor vrouwen in de perimenopauze, met kennis van orthomoleculaire voedingsleer.
Je bent GEEN arts, GEEN therapeut en GEEN medisch hulpmiddel.

EXPERTISE:
• Orthomoleculaire voedingsleer specifiek voor vrouwen met hormonale klachten
• Perimenopauze en hormonale veranderingen
• Micronutriënten en hun invloed op hormoonbalans
• Leefstijlfactoren en hormoonregulatie

Je mag NOOIT:
• medische diagnoses stellen
• medicijnen of supplementen voorschrijven
• specifieke doseringen noemen
• oorzakelijke claims maken
• garanties geven over resultaten

Je taak is:
• uitgebreide maandpatronen analyseren
• verbanden zichtbaar maken tussen voeding, slaap, beweging en beleving
• educatieve informatie geven over hormonen en voeding
• uitnodigen tot zelfobservatie en gesprek met zorgverlener

ORTHOMOLECULAIRE CONTEXT (educatief):
• B-vitamines: betrokken bij energieproductie en neurotransmitters
• Magnesium: ondersteunt ontspanning en slaap
• Omega-3: kan ontstekingsprocessen beïnvloeden
• Vitamine D: betrokken bij stemmingsregulatie
• Zink: ondersteunt hormoonproductie
• IJzer: belangrijk voor energie, vaak laag rond menstruatie

HORMOONCONTEXT (educatief):
• Oestrogeen: beïnvloedt stemming, slaap, huid, cognitie
• Progesteron: kalmerend, beïnvloedt slaap en angst
• Cortisol: stresshormoon, interacties met andere hormonen
• Insuline: bloedsuikerregulatie, beïnvloedt energie en cravings

STRUCTUUR OUTPUT (JSON):
{
  "summary": "Korte samenvatting van de maand (max 3 zinnen)",
  "patterns": [
    {
      "domain": "sleep|food|cycle|mood|energy",
      "observation": "wat je ziet in de data (max 2 zinnen)",
      "hormoneContext": "welke hormonen mogelijk een rol spelen (educatief, max 1 zin)"
    }
  ],
  "hormoneAnalysis": "Uitgebreide analyse van hormoonpatronen gedurende de maand, gebaseerd op cyclusfase en beleving (max 4 zinnen)",
  "nutritionInsights": "Orthomoleculaire observaties over voedingspatronen en mogelijke verbanden met beleving (max 3 zinnen)",
  "sleepAnalysis": "Analyse van slaappatronen in relatie tot cyclus en hormonen (max 3 zinnen)",
  "movementAnalysis": "Analyse van beweging/energie patronen (max 2 zinnen)",
  "recommendations": [
    "Observatie of aandachtspunt (geen medisch advies, max 5 items)"
  ],
  "talkToProvider": "Suggestie om met zorgverlener te bespreken indien relevant (max 1 zin)",
  "positiveNote": "Positieve observatie of bemoediging (max 1 zin)"
}

REGELS:
• Max 600 woorden totaal
• Altijd disclaimer toevoegen
• Geen specifieke supplementadvies
• Geen doseringen
• Focus op patronen en observaties
• Moedig gesprek met zorgverlener aan`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check consent
    const { data: consent } = await supabase
      .from('user_consents')
      .select('accepted_ai_processing')
      .eq('owner_id', user.id)
      .single();

    if (!consent?.accepted_ai_processing) {
      return new Response(JSON.stringify({
        error: 'consent_required',
        message: 'AI-toestemming is vereist voor deze analyse.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check monthly limit (1 per month)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('function_name', 'monthly-analysis')
      .gte('created_at', monthStart.toISOString());

    if ((count || 0) >= 1) {
      return new Response(JSON.stringify({
        error: 'limit_exceeded',
        message: 'Je hebt deze maand al een maandanalyse gegenereerd. Probeer het volgende maand opnieuw.'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user data from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [mealsResult, sleepResult, cycleLogsResult, symptomsResult, contextResult, predictionResult] = await Promise.all([
      supabase.from('meals').select('*').eq('owner_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('sleep_sessions').select('*').eq('owner_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('cycle_symptom_logs').select('*').eq('owner_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('symptoms').select('*').eq('owner_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('daily_context').select('*').eq('owner_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('cycle_predictions').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1),
    ]);

    // Build anonymized context
    const meals = mealsResult.data || [];
    const sleepSessions = sleepResult.data || [];
    const cycleLogs = cycleLogsResult.data || [];
    const symptoms = symptomsResult.data || [];
    const contexts = contextResult.data || [];
    const prediction = predictionResult.data?.[0];

    // Calculate aggregates (no personal identifiers)
    const avgProtein = meals.length > 0 ? meals.reduce((sum, m) => sum + (m.protein_g || 0), 0) / meals.length : 0;
    const avgFiber = meals.length > 0 ? meals.reduce((sum, m) => sum + (m.fiber_g || 0), 0) / meals.length : 0;
    const avgSleepQuality = sleepSessions.length > 0 ? sleepSessions.reduce((sum, s) => sum + (s.quality_score || 0), 0) / sleepSessions.length : 0;
    const avgSleepDuration = sleepSessions.length > 0 ? sleepSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / sleepSessions.length : 0;
    
    // Symptom frequency
    const symptomCounts: Record<string, number> = {};
    symptoms.forEach(s => {
      symptomCounts[s.symptom_code] = (symptomCounts[s.symptom_code] || 0) + 1;
    });
    const topSymptoms = Object.entries(symptomCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    // Cycle symptom patterns
    const moodAvg = cycleLogs.filter(l => l.mood !== null).reduce((sum, l) => sum + (l.mood || 0), 0) / Math.max(1, cycleLogs.filter(l => l.mood !== null).length);
    const energyAvg = cycleLogs.filter(l => l.energy !== null).reduce((sum, l) => sum + (l.energy || 0), 0) / Math.max(1, cycleLogs.filter(l => l.energy !== null).length);
    const hotFlashDays = cycleLogs.filter(l => l.hot_flashes).length;
    const headacheDays = cycleLogs.filter(l => l.headache).length;

    const context = `MAANDOVERZICHT (laatste 30 dagen, geanonimiseerd):

VOEDING:
- Aantal gelogde maaltijden: ${meals.length}
- Gemiddeld eiwit per maaltijd: ${avgProtein.toFixed(1)}g
- Gemiddelde vezels per maaltijd: ${avgFiber.toFixed(1)}g

SLAAP:
- Aantal slaapsessies: ${sleepSessions.length}
- Gemiddelde slaapkwaliteit: ${avgSleepQuality.toFixed(1)}/10
- Gemiddelde slaapduur: ${(avgSleepDuration / 60).toFixed(1)} uur

CYCLUS:
- Huidige fase: ${prediction?.current_phase || 'onbekend'}
- Huidige seizoen: ${prediction?.current_season || 'onbekend'}
- Gemiddelde stemming: ${moodAvg.toFixed(1)}/10
- Gemiddelde energie: ${energyAvg.toFixed(1)}/10
- Dagen met opvliegers: ${hotFlashDays}
- Dagen met hoofdpijn: ${headacheDays}

MEEST VOORKOMENDE ERVARINGEN:
${topSymptoms.map(s => `- ${s.code}: ${s.count}x`).join('\n')}

DAGELIJKSE CONTEXT:
- Gemiddelde stressscore: ${contexts.length > 0 ? (contexts.reduce((sum, c) => sum + (c.stress_0_10 || 0), 0) / contexts.length).toFixed(1) : 'onbekend'}/10

Genereer een uitgebreide maandanalyse met focus op orthomoleculaire inzichten en hormoonpatronen.`;

    // Track usage
    await supabase.from('ai_usage').insert({ 
      owner_id: user.id, 
      function_name: 'monthly-analysis' 
    });

    // Call OpenAI
    const openAIKey = Deno.env.get('ChatGPT');
    if (!openAIKey) {
      return new Response(JSON.stringify({
        error: 'ai_not_configured',
        message: 'AI-service is niet geconfigureerd.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: monthlyAnalysisPrompt },
          { role: 'user', content: context }
        ],
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI error:', response.status);
      return new Response(JSON.stringify({
        error: 'ai_error',
        message: 'Er ging iets mis bij het genereren van de analyse.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      result = {
        summary: "De analyse kon niet volledig worden gegenereerd.",
        patterns: [],
        hormoneAnalysis: content || "Probeer het later opnieuw.",
        nutritionInsights: "",
        recommendations: [],
      };
    }

    result.disclaimer = "Deze analyse is puur informatief en gebaseerd op orthomoleculaire voedingsleer. Het is geen medisch advies. Bespreek eventuele zorgen altijd met je huisarts of een gekwalificeerde zorgverlener.";
    result.generatedAt = new Date().toISOString();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in monthly-analysis:', error);
    return new Response(JSON.stringify({
      error: 'service_error',
      message: 'Er ging iets mis. Probeer het later opnieuw.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
