import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SupportedLanguage = 'nl' | 'en';

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

const prompts = {
  nl: {
    system: `ROL & KADER

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
• Moedig gesprek met zorgverlener aan`,
    disclaimer: "Deze analyse is puur informatief en gebaseerd op orthomoleculaire voedingsleer. Het is geen medisch advies. Bespreek eventuele zorgen altijd met je huisarts of een gekwalificeerde zorgverlener.",
    consentRequired: 'AI-toestemming is vereist voor deze analyse.',
    aiNotConfigured: 'AI-service is niet geconfigureerd.',
    aiError: 'Er ging iets mis bij het genereren van de analyse.',
    serviceError: 'Er ging iets mis. Probeer het later opnieuw.',
  },
  en: {
    system: `ROLE & FRAMEWORK

You are a supportive reflection assistant for women, with knowledge of lifestyle and nutrition.
You are NOT a doctor, NOT a therapist, and NOT a medical device.

EXPERTISE:
• Lifestyle factors such as nutrition, sleep and movement
• Recognizing patterns in daily habits
• Cycle awareness and energy fluctuations

You may NEVER:
• make medical diagnoses
• prescribe or mention medications or supplements
• mention specific vitamins, minerals or dosages
• make causal claims
• give guarantees about results
• give medical advice

Your task is:
• analyze monthly patterns based on nutrition, sleep and movement
• make connections visible between lifestyle and experience
• invite self-observation and conversation with healthcare provider

HORMONE CONTEXT (general, educational only):
• Hormones fluctuate throughout the cycle and can influence energy and mood
• This is normal and part of the body

OUTPUT STRUCTURE (JSON):
{
  "summary": "Short summary of the month (max 3 sentences)",
  "patterns": [
    {
      "domain": "sleep|food|cycle|mood|energy",
      "observation": "what you see in the data (max 2 sentences)",
      "context": "general context without medical claims (max 1 sentence)"
    }
  ],
  "lifestyleAnalysis": "Analysis of lifestyle patterns during the month (max 4 sentences)",
  "nutritionInsights": "Observations about nutrition patterns and possible connections with experience (max 3 sentences, no supplement advice)",
  "sleepAnalysis": "Analysis of sleep patterns (max 3 sentences)",
  "movementAnalysis": "Analysis of movement/energy patterns (max 2 sentences)",
  "recommendations": [
    "Lifestyle observation or point of attention (no medical advice, max 5 items)"
  ],
  "talkToProvider": "Suggestion to discuss with healthcare provider if relevant (max 1 sentence)",
  "positiveNote": "Positive observation or encouragement (max 1 sentence)"
}

RULES:
• Max 600 words total
• Always add disclaimer
• Never mention supplements, vitamins or minerals
• No dosages
• Focus on patterns and observations
• Encourage conversation with healthcare provider`,
    disclaimer: "This analysis is purely informational and based on orthomolecular nutrition. It is not medical advice. Always discuss any concerns with your doctor or a qualified healthcare provider.",
    consentRequired: 'AI consent is required for this analysis.',
    aiNotConfigured: 'AI service is not configured.',
    aiError: 'Something went wrong while generating the analysis.',
    serviceError: 'Something went wrong. Please try again later.',
  },
};

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

    // Parse request body for language
    let language: SupportedLanguage = 'nl';
    try {
      const body = await req.json();
      language = getLanguage(body.language);
    } catch {
      // No body or invalid JSON, use default language
    }

    const t = prompts[language];

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
        message: t.consentRequired
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if analysis already exists for this month (check cache, not usage)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthKey = monthStart.toISOString().split('T')[0]; // yyyy-MM-dd
    
    const { data: existingCache } = await supabase
      .from('ai_insights_cache')
      .select('insight_data, created_at')
      .eq('owner_id', user.id)
      .eq('insight_type', 'monthly-analysis')
      .eq('insight_date', monthKey)
      .maybeSingle();

    // If cached analysis exists, return it instead of generating new one
    if (existingCache) {
      console.log('Returning cached monthly analysis');
      const cachedResult = existingCache.insight_data as Record<string, unknown>;
      return new Response(JSON.stringify({
        ...cachedResult,
        generatedAt: existingCache.created_at,
        fromCache: true,
      }), {
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

    const frequencyLabels = language === 'en'
      ? { none: 'not logged', occasional: 'occasional', regular: 'regular', frequent: 'frequent' }
      : { none: 'niet gelogd', occasional: 'incidenteel', regular: 'regelmatig', frequent: 'frequent' };

    const topSymptoms = Object.entries(symptomCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ 
        code, 
        frequency: count <= 3 ? frequencyLabels.occasional : count <= 7 ? frequencyLabels.regular : frequencyLabels.frequent 
      }));

    // Cycle symptom patterns (categorized)
    const moodLogs = cycleLogs.filter(l => l.mood !== null);
    const energyLogs = cycleLogs.filter(l => l.energy !== null);
    const moodAvg = moodLogs.length > 0 ? moodLogs.reduce((sum, l) => sum + (l.mood || 0), 0) / moodLogs.length : 0;
    const energyAvg = energyLogs.length > 0 ? energyLogs.reduce((sum, l) => sum + (l.energy || 0), 0) / energyLogs.length : 0;
    const hotFlashDays = cycleLogs.filter(l => l.hot_flashes).length;
    const headacheDays = cycleLogs.filter(l => l.headache).length;

    const categoryLabels = language === 'en'
      ? { none: 'unknown', few: 'few', average: 'average', many: 'many', low: 'low', medium: 'medium', good: 'good', short: 'short', long: 'long', varying: 'varying', elevated: 'elevated' }
      : { none: 'onbekend', few: 'weinig', average: 'gemiddeld', many: 'veel', low: 'laag', medium: 'gemiddeld', good: 'goed', short: 'kort', long: 'lang', varying: 'wisselend', elevated: 'verhoogd' };

    // Build MINIMAL CONTEXT PACK with CATEGORICAL data only
    const context = language === 'en' 
      ? `MONTHLY OVERVIEW (last 30 days, anonymized - no personal identifiers):

NUTRITION:
- Meals logged: ${meals.length === 0 ? 'none' : meals.length < 10 ? 'few' : meals.length < 50 ? 'average' : 'many'}
- Protein intake: ${avgProtein < 30 ? 'low' : avgProtein < 50 ? 'medium' : 'good'}
- Fiber intake: ${avgFiber < 15 ? 'low' : avgFiber < 25 ? 'medium' : 'good'}

SLEEP:
- Sleep sessions logged: ${sleepSessions.length === 0 ? 'none' : sleepSessions.length < 10 ? 'few' : 'regular'}
- Sleep quality: ${avgSleepQuality < 4 ? 'low' : avgSleepQuality < 7 ? 'medium' : 'good'}
- Sleep duration: ${avgSleepDuration < 360 ? 'short' : avgSleepDuration < 480 ? 'average' : 'long'}

CYCLE:
- Current phase: ${prediction?.current_phase || 'unknown'}
- Current season: ${prediction?.current_season || 'unknown'}
- Mood: ${moodAvg < 4 ? 'low' : moodAvg < 7 ? 'varying' : 'good'}
- Energy: ${energyAvg < 4 ? 'low' : energyAvg < 7 ? 'varying' : 'good'}
- Hot flashes: ${hotFlashDays === 0 ? 'not logged' : hotFlashDays <= 3 ? 'occasional' : 'regular'}
- Headaches: ${headacheDays === 0 ? 'not logged' : headacheDays <= 3 ? 'occasional' : 'regular'}

MOST COMMON EXPERIENCES:
${topSymptoms.map(s => `- ${s.code}: ${s.frequency}`).join('\n') || '- No experiences logged'}

STRESS:
- Stress level: ${contexts.length === 0 ? 'unknown' : (contexts.reduce((sum, c) => sum + (c.stress_0_10 || 0), 0) / contexts.length) < 4 ? 'low' : 'elevated'}

Generate a comprehensive monthly analysis focusing on lifestyle patterns and hormone patterns.`
      : `MAANDOVERZICHT (laatste 30 dagen, geanonimiseerd - geen persoonlijke identificatoren):

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

Genereer een uitgebreide maandanalyse met focus op leefstijlpatronen en hormoonpatronen.`;

    // Use direct OpenAI API for full control and GDPR compliance
    const OPENAI_API_KEY = Deno.env.get('ChatGPT');
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        error: 'ai_not_configured',
        message: t.aiNotConfigured
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
          { role: 'system', content: t.system },
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
        message: t.aiError
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
        summary: language === 'en' ? "The analysis could not be fully generated." : "De analyse kon niet volledig worden gegenereerd.",
        patterns: [],
        hormoneAnalysis: content || (language === 'en' ? "Please try again later." : "Probeer het later opnieuw."),
        nutritionInsights: "",
        recommendations: [],
      };
    }

    result.disclaimer = t.disclaimer;
    result.generatedAt = new Date().toISOString();

    // Save to cache AFTER successful generation (this prevents the mismatch issue)
    await supabase
      .from('ai_insights_cache')
      .upsert({
        owner_id: user.id,
        insight_type: 'monthly-analysis',
        insight_date: monthKey,
        insight_data: result,
      }, {
        onConflict: 'owner_id,insight_type,insight_date',
        ignoreDuplicates: false,
      });

    // Track usage AFTER successful generation and caching
    await supabase.from('ai_usage').insert({ 
      owner_id: user.id, 
      function_name: 'monthly-analysis' 
    });

    console.log('Monthly analysis generated and cached for subject:', aiSubjectId);

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
