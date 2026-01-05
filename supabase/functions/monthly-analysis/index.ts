import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Comprehensive monthly analysis prompt - no medical/supplement advice
const monthlyAnalysisPrompt = `ROL & KADER

Je bent een ondersteunende reflectie-assistent voor vrouwen, met kennis van leefstijl en voeding.
Je bent GEEN arts, GEEN therapeut en GEEN medisch hulpmiddel.

EXPERTISE:
• Leefstijlfactoren zoals voeding, slaap en beweging
• Patronen herkennen in dagelijkse gewoontes
• Cyclusbewustzijn en energie-fluctuaties

Je mag NOOIT:
• medische diagnoses stellen
• medicijnen of supplementen voorschrijven of noemen
• specifieke vitamines, mineralen of doseringen noemen
• oorzakelijke claims maken
• garanties geven over resultaten
• medisch advies geven

Je taak is:
• maandpatronen analyseren op basis van voeding, slaap en beweging
• verbanden zichtbaar maken tussen leefstijl en beleving
• uitnodigen tot zelfobservatie en gesprek met zorgverlener

HORMOONCONTEXT (alleen algemeen, educatief):
• Hormonen fluctueren gedurende de cyclus en kunnen energie en stemming beïnvloeden
• Dit is normaal en onderdeel van het lichaam

STRUCTUUR OUTPUT (JSON):
{
  "summary": "Korte samenvatting van de maand (max 3 zinnen)",
  "patterns": [
    {
      "domain": "sleep|food|cycle|mood|energy",
      "observation": "wat je ziet in de data (max 2 zinnen)",
      "context": "algemene context zonder medische claims (max 1 zin)"
    }
  ],
  "lifestyleAnalysis": "Analyse van leefstijlpatronen gedurende de maand (max 4 zinnen)",
  "nutritionInsights": "Observaties over voedingspatronen en mogelijke verbanden met beleving (max 3 zinnen, geen supplementadvies)",
  "sleepAnalysis": "Analyse van slaappatronen (max 3 zinnen)",
  "movementAnalysis": "Analyse van beweging/energie patronen (max 2 zinnen)",
  "recommendations": [
    "Leefstijl observatie of aandachtspunt (geen medisch advies, max 5 items)"
  ],
  "talkToProvider": "Suggestie om met zorgverlener te bespreken indien relevant (max 1 zin)",
  "positiveNote": "Positieve observatie of bemoediging (max 1 zin)"
}

REGELS:
• Max 600 woorden totaal
• Altijd disclaimer toevoegen
• Nooit supplementen, vitamines of mineralen noemen
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

    const aiSubjectId = generateAISubjectId(user.id);

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

    // Fetch user data from the last 30 days (only aggregate stats, no raw data to AI)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [mealsResult, sleepResult, cycleLogsResult, symptomsResult, contextResult, predictionResult] = await Promise.all([
      supabase.from('meals').select('protein_g, fiber_g, kcal').eq('owner_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('sleep_sessions').select('quality_score, duration_minutes').eq('owner_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('cycle_symptom_logs').select('mood, energy, hot_flashes, headache').eq('owner_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('symptoms').select('symptom_code').eq('owner_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('daily_context').select('stress_0_10').eq('owner_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('cycle_predictions').select('current_phase, current_season').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1),
    ]);

    // Build ANONYMIZED AGGREGATES (no PII, no raw data)
    const meals = mealsResult.data || [];
    const sleepSessions = sleepResult.data || [];
    const cycleLogs = cycleLogsResult.data || [];
    const symptoms = symptomsResult.data || [];
    const contexts = contextResult.data || [];
    const prediction = predictionResult.data?.[0];

    // Calculate aggregates (categorized, not exact)
    const avgProtein = meals.length > 0 ? meals.reduce((sum, m) => sum + (m.protein_g || 0), 0) / meals.length : 0;
    const avgFiber = meals.length > 0 ? meals.reduce((sum, m) => sum + (m.fiber_g || 0), 0) / meals.length : 0;
    const avgSleepQuality = sleepSessions.length > 0 ? sleepSessions.reduce((sum, s) => sum + (s.quality_score || 0), 0) / sleepSessions.length : 0;
    const avgSleepDuration = sleepSessions.length > 0 ? sleepSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / sleepSessions.length : 0;
    
    // Symptom frequency (categorized)
    const symptomCounts: Record<string, number> = {};
    symptoms.forEach(s => {
      symptomCounts[s.symptom_code] = (symptomCounts[s.symptom_code] || 0) + 1;
    });
    const topSymptoms = Object.entries(symptomCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ 
        code, 
        frequency: count <= 3 ? 'incidenteel' : count <= 7 ? 'regelmatig' : 'frequent' 
      }));

    // Cycle symptom patterns (categorized)
    const moodLogs = cycleLogs.filter(l => l.mood !== null);
    const energyLogs = cycleLogs.filter(l => l.energy !== null);
    const moodAvg = moodLogs.length > 0 ? moodLogs.reduce((sum, l) => sum + (l.mood || 0), 0) / moodLogs.length : 0;
    const energyAvg = energyLogs.length > 0 ? energyLogs.reduce((sum, l) => sum + (l.energy || 0), 0) / energyLogs.length : 0;
    const hotFlashDays = cycleLogs.filter(l => l.hot_flashes).length;
    const headacheDays = cycleLogs.filter(l => l.headache).length;

    // Build MINIMAL CONTEXT PACK with CATEGORICAL data only
    const context = `MAANDOVERZICHT (laatste 30 dagen, geanonimiseerd - geen persoonlijke identificatoren):

VOEDING:
- Maaltijden gelogd: ${meals.length === 0 ? 'geen' : meals.length < 10 ? 'weinig' : meals.length < 50 ? 'gemiddeld' : 'veel'}
- Eiwitinname: ${avgProtein < 30 ? 'laag' : avgProtein < 50 ? 'gemiddeld' : 'goed'}
- Vezelinname: ${avgFiber < 15 ? 'laag' : avgFiber < 25 ? 'gemiddeld' : 'goed'}

SLAAP:
- Slaapsessies gelogd: ${sleepSessions.length === 0 ? 'geen' : sleepSessions.length < 10 ? 'weinig' : 'regelmatig'}
- Slaapkwaliteit: ${avgSleepQuality < 4 ? 'laag' : avgSleepQuality < 7 ? 'gemiddeld' : 'goed'}
- Slaapduur: ${avgSleepDuration < 360 ? 'kort' : avgSleepDuration < 480 ? 'gemiddeld' : 'lang'}

CYCLUS:
- Huidige fase: ${prediction?.current_phase || 'onbekend'}
- Huidige seizoen: ${prediction?.current_season || 'onbekend'}
- Stemming: ${moodAvg < 4 ? 'laag' : moodAvg < 7 ? 'wisselend' : 'goed'}
- Energie: ${energyAvg < 4 ? 'laag' : energyAvg < 7 ? 'wisselend' : 'goed'}
- Opvliegers: ${hotFlashDays === 0 ? 'niet gelogd' : hotFlashDays <= 3 ? 'incidenteel' : 'regelmatig'}
- Hoofdpijn: ${headacheDays === 0 ? 'niet gelogd' : headacheDays <= 3 ? 'incidenteel' : 'regelmatig'}

MEEST VOORKOMENDE ERVARINGEN:
${topSymptoms.map(s => `- ${s.code}: ${s.frequency}`).join('\n') || '- Geen ervaringen gelogd'}

STRESS:
- Stressniveau: ${contexts.length === 0 ? 'onbekend' : (contexts.reduce((sum, c) => sum + (c.stress_0_10 || 0), 0) / contexts.length) < 4 ? 'laag' : 'verhoogd'}

Genereer een uitgebreide maandanalyse met focus op orthomoleculaire inzichten en hormoonpatronen.`;

    // Track usage
    await supabase.from('ai_usage').insert({ 
      owner_id: user.id, 
      function_name: 'monthly-analysis' 
    });

    // Use direct OpenAI API for full control and GDPR compliance
    const OPENAI_API_KEY = Deno.env.get('ChatGPT');
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        error: 'ai_not_configured',
        message: 'AI-service is niet geconfigureerd.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating monthly analysis via OpenAI API, subject:', aiSubjectId);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: monthlyAnalysisPrompt },
          { role: 'user', content: context }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
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

    console.log('Monthly analysis generated for subject:', aiSubjectId);

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
