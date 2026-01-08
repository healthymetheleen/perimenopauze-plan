import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getPrompt, type SupportedLanguage } from "../_shared/prompts.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getLanguage(lang?: string): SupportedLanguage {
  if (lang === 'en') return 'en';
  return 'nl';
}

// Privacy: generate AI subject ID for logging
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

// Fallback system prompts (used if not found in database)
const fallbackSystemPrompts: Record<SupportedLanguage, string> = {
  nl: `ROL & KADER

Je bent een ondersteunende reflectie-assistent voor vrouwen in de perimenopauze.
Je bent GEEN arts en geeft GEEN medisch advies.

TAAK: Analyseer de voedingsdata van gisteren en geef gepersonaliseerd advies.

INPUT: Je ontvangt gecategoriseerde voedingsdata (laag/gemiddeld/goed) en het huidige cyclusseizoen.

OUTPUT: Alleen geldige JSON (geen markdown, geen code blocks), met deze structuur:
{
  "highlights": ["positief punt 1", "positief punt 2"],
  "improvements": ["verbeterpunt met context"],
  "lifestyleTips": {
    "foods": ["voedingstip 1", "voedingstip 2"],
    "habits": ["gewoonte tip 1", "gewoonte tip 2"]
  },
  "seasonTip": "één zin over het huidige seizoen"
}

REGELS:
- highlights: 2-3 positieve punten (max 15 woorden per item)
- improvements: 1-2 verbeterpunten met context (max 20 woorden per item)
- lifestyleTips: 2-3 items per array, gebaseerd op cyclusseizoen
- seasonTip: max 20 woorden
- Taal: Nederlands, warm en niet-oordelend
- Focus op wat goed ging, normaliseer variatie`,

  en: `ROLE & FRAMEWORK

You are a supportive reflection assistant for women in perimenopause.
You are NOT a doctor and do NOT give medical advice.

TASK: Analyze yesterday's nutrition data and provide personalized advice.

INPUT: You receive categorized nutrition data (low/medium/good) and the current cycle season.

OUTPUT: Only valid JSON (no markdown, no code blocks), with this structure:
{
  "highlights": ["positive point 1", "positive point 2"],
  "improvements": ["improvement with context"],
  "lifestyleTips": {
    "foods": ["food tip 1", "food tip 2"],
    "habits": ["habit tip 1", "habit tip 2"]
  },
  "seasonTip": "one sentence about the current season"
}

RULES:
- highlights: 2-3 positive points (max 15 words each)
- improvements: 1-2 areas for improvement with context (max 20 words each)
- lifestyleTips: 2-3 items per array, based on cycle season
- seasonTip: max 20 words
- Language: English, warm and non-judgmental
- Focus on what went well, normalize variation`
};

// Fallback lifestyle tips per season (used if AI fails)
const seasonLifestyleTips = {
  nl: {
    winter: {
      foods: ['Warme maaltijden met groenten', 'Eiwitrijk ontbijt', 'Soepen en stoofpotjes'],
      habits: ['Extra rust nemen', 'Zachte beweging zoals wandelen of yoga'],
    },
    lente: {
      foods: ['Verse groenten en fruit', 'Gevarieerde maaltijden', 'Voldoende water'],
      habits: ['Opbouwen van activiteiten', 'Buiten zijn voor daglicht'],
    },
    zomer: {
      foods: ['Lichte maaltijden', 'Veel water en groenten', 'Fruit als tussendoor'],
      habits: ['Goed hydrateren', 'Beweging in de ochtend of avond'],
    },
    herfst: {
      foods: ['Regelmatige maaltijdtijden', 'Minder suiker en alcohol', 'Warme dranken'],
      habits: ['Vroeger naar bed', 'Structuur in je dag'],
    },
  },
  en: {
    winter: {
      foods: ['Warm meals with vegetables', 'Protein-rich breakfast', 'Soups and stews'],
      habits: ['Take extra rest', 'Gentle movement like walking or yoga'],
    },
    lente: {
      foods: ['Fresh vegetables and fruit', 'Varied meals', 'Plenty of water'],
      habits: ['Build up activities', 'Be outside for daylight'],
    },
    zomer: {
      foods: ['Light meals', 'Lots of water and vegetables', 'Fruit as snacks'],
      habits: ['Stay well hydrated', 'Exercise in the morning or evening'],
    },
    herfst: {
      foods: ['Regular meal times', 'Less sugar and alcohol', 'Warm drinks'],
      habits: ['Go to bed earlier', 'Structure in your day'],
    },
  },
};

const translations = {
  nl: {
    disclaimer: 'Deze informatie is educatief en geen medisch advies.',
    error: 'Er ging iets mis',
    meals: 'maaltijden',
    kcal: 'kcal',
    protein: 'eiwit',
    fiber: 'vezels',
    highlights: {
      protein: '✓ Goed eiwitinname (50g+)',
      fiber: '✓ Uitstekende vezelinname (25g+)',
      meals: '✓ Regelmatig gegeten',
    },
    improvements: {
      protein: (val: number) => `Eiwit was ${val}g - probeer 50g+ voor spieren & energie`,
      fiber: (val: number) => `Vezels waren ${val}g - streef naar 25g+ voor darmen`,
      meals: 'Slechts 1 maaltijd gelogd - regelmatig eten stabiliseert je bloedsuiker',
    },
    seasonTips: {
      winter: 'Focus op warme, voedzame maaltijden en rust. Je lichaam herstelt nu.',
      lente: 'Ideale tijd voor verse, gevarieerde maaltijden. Je stofwisseling is optimaal.',
      zomer: 'Licht en voedzaam eten, veel water. Je energie is op z\'n piek!',
      herfst: 'Stabiele maaltijdtijden zijn cruciaal. Vermijd suiker en alcohol.',
      default: 'Log je cyclus om seizoensgebonden tips te ontvangen.',
    },
  },
  en: {
    disclaimer: 'This information is educational and not medical advice.',
    error: 'Something went wrong',
    meals: 'meals',
    kcal: 'kcal',
    protein: 'protein',
    fiber: 'fiber',
    highlights: {
      protein: '✓ Good protein intake (50g+)',
      fiber: '✓ Excellent fiber intake (25g+)',
      meals: '✓ Regular eating pattern',
    },
    improvements: {
      protein: (val: number) => `Protein was ${val}g - aim for 50g+ for muscles & energy`,
      fiber: (val: number) => `Fiber was ${val}g - aim for 25g+ for gut health`,
      meals: 'Only 1 meal logged - regular eating stabilizes blood sugar',
    },
    seasonTips: {
      winter: 'Focus on warm, nutritious meals and rest. Your body is recovering now.',
      lente: 'Ideal time for fresh, varied meals. Your metabolism is optimal.',
      zomer: 'Light and nutritious eating, lots of water. Your energy is at its peak!',
      herfst: 'Stable meal times are crucial. Avoid sugar and alcohol.',
      default: 'Log your cycle to receive season-specific tips.',
    },
  },
};

// Categorize values for privacy (no exact values sent to AI)
function categorizeProtein(val: number): string {
  if (val < 30) return 'laag';
  if (val < 50) return 'gemiddeld';
  return 'goed';
}

function categorizeFiber(val: number): string {
  if (val < 15) return 'laag';
  if (val < 25) return 'gemiddeld';
  return 'goed';
}

function categorizeKcal(val: number): string {
  if (val < 1200) return 'laag';
  if (val < 2000) return 'gemiddeld';
  return 'hoog';
}

function categorizeMeals(val: number): string {
  if (val === 0) return 'geen';
  if (val < 3) return 'weinig';
  if (val < 5) return 'gemiddeld';
  return 'veel';
}

// Rule-based fallback analysis
function generateRuleBasedAnalysis(
  yesterdayScore: { meals_count: number; kcal_total: number; protein_g: number; fiber_g: number } | null,
  currentSeason: string,
  lang: SupportedLanguage
) {
  const t = translations[lang];
  const tips = seasonLifestyleTips[lang][currentSeason as keyof typeof seasonLifestyleTips.nl] || seasonLifestyleTips[lang].lente;
  
  const analysis = {
    hasYesterdayData: !!yesterdayScore && yesterdayScore.meals_count > 0,
    yesterdaySummary: null as string | null,
    highlights: [] as string[],
    improvements: [] as string[],
    lifestyleTips: tips,
    seasonTip: '',
    disclaimer: t.disclaimer,
  };

  if (yesterdayScore && yesterdayScore.meals_count > 0) {
    const kcal = yesterdayScore.kcal_total || 0;
    const protein = yesterdayScore.protein_g || 0;
    const fiber = yesterdayScore.fiber_g || 0;
    const meals = yesterdayScore.meals_count || 0;

    analysis.yesterdaySummary = `${meals} ${t.meals} · ${Math.round(kcal)} ${t.kcal} · ${Math.round(protein)}g ${t.protein} · ${Math.round(fiber)}g ${t.fiber}`;

    if (protein >= 50) analysis.highlights.push(t.highlights.protein);
    if (fiber >= 25) analysis.highlights.push(t.highlights.fiber);
    if (meals >= 3) analysis.highlights.push(t.highlights.meals);

    if (protein < 40) analysis.improvements.push(t.improvements.protein(Math.round(protein)));
    if (fiber < 20) analysis.improvements.push(t.improvements.fiber(Math.round(fiber)));
    if (meals < 2) analysis.improvements.push(t.improvements.meals);
  }

  const seasonKey = currentSeason as keyof typeof t.seasonTips;
  analysis.seasonTip = t.seasonTips[seasonKey] || t.seasonTips.default;

  return analysis;
}

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
    let language = 'nl';
    try {
      const body = await req.json();
      language = body.language || 'nl';
    } catch {
      // No body or invalid JSON, use default language
    }
    
    const lang = getLanguage(language);
    const t = translations[lang];

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiSubjectId = generateAISubjectId(user.id);
    console.log('Fetching daily analysis for subject:', aiSubjectId);

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get yesterday's nutrition data (only aggregates, no raw data)
    const { data: yesterdayScore } = await supabase
      .from('v_daily_scores')
      .select('meals_count, kcal_total, protein_g, fiber_g')
      .eq('owner_id', user.id)
      .eq('day_date', yesterdayStr)
      .maybeSingle();

    // Get current cycle prediction
    const { data: prediction } = await supabase
      .from('cycle_predictions')
      .select('current_season, current_phase')
      .eq('owner_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentSeason = prediction?.current_season || 'onbekend';

    // Check if we have yesterday's data to analyze
    if (!yesterdayScore || yesterdayScore.meals_count === 0) {
      console.log('No yesterday data, returning empty analysis for subject:', aiSubjectId);
      const tips = seasonLifestyleTips[lang][currentSeason as keyof typeof seasonLifestyleTips.nl] || seasonLifestyleTips[lang].lente;
      const seasonKey = currentSeason as keyof typeof t.seasonTips;
      
      return new Response(JSON.stringify({
        hasYesterdayData: false,
        yesterdaySummary: null,
        highlights: [],
        improvements: [],
        lifestyleTips: tips,
        seasonTip: t.seasonTips[seasonKey] || t.seasonTips.default,
        disclaimer: t.disclaimer,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try AI-based analysis
    const OPENAI_API_KEY = Deno.env.get('ChatGPT');
    
    if (!OPENAI_API_KEY) {
      console.warn('OpenAI not configured, using rule-based fallback for subject:', aiSubjectId);
      const analysis = generateRuleBasedAnalysis(yesterdayScore, currentSeason, lang);
      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get dynamic system prompt from database
    const systemPrompt = await getPrompt(
      'daily_analysis_system',
      lang,
      fallbackSystemPrompts[lang]
    );

    // Build user prompt with CATEGORIZED data only (privacy)
    const kcal = yesterdayScore.kcal_total || 0;
    const protein = yesterdayScore.protein_g || 0;
    const fiber = yesterdayScore.fiber_g || 0;
    const meals = yesterdayScore.meals_count || 0;

    const userPrompt = JSON.stringify({
      nutrition: {
        mealsLogged: categorizeMeals(meals),
        proteinLevel: categorizeProtein(protein),
        fiberLevel: categorizeFiber(fiber),
        kcalLevel: categorizeKcal(kcal),
      },
      cycleSeason: currentSeason || 'onbekend',
      language: lang === 'nl' ? 'Nederlands' : 'English',
    });

    console.log('Calling OpenAI for daily analysis, subject:', aiSubjectId);

    try {
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
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        console.warn('Using rule-based fallback for subject:', aiSubjectId);
        const analysis = generateRuleBasedAnalysis(yesterdayScore, currentSeason, lang);
        return new Response(JSON.stringify(analysis), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;

      if (!content) {
        console.warn('Empty AI response, using rule-based fallback for subject:', aiSubjectId);
        const analysis = generateRuleBasedAnalysis(yesterdayScore, currentSeason, lang);
        return new Response(JSON.stringify(analysis), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse AI response (try to extract JSON)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON in AI response, using rule-based fallback for subject:', aiSubjectId);
        const analysis = generateRuleBasedAnalysis(yesterdayScore, currentSeason, lang);
        return new Response(JSON.stringify(analysis), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('AI analysis successful for subject:', aiSubjectId);

      // Build summary string
      const yesterdaySummary = `${meals} ${t.meals} · ${Math.round(kcal)} ${t.kcal} · ${Math.round(protein)}g ${t.protein} · ${Math.round(fiber)}g ${t.fiber}`;

      // Fallback tips in case AI doesn't provide them
      const fallbackTips = seasonLifestyleTips[lang][currentSeason as keyof typeof seasonLifestyleTips.nl] || seasonLifestyleTips[lang].lente;
      const seasonKey = currentSeason as keyof typeof t.seasonTips;

      return new Response(JSON.stringify({
        hasYesterdayData: true,
        yesterdaySummary,
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        lifestyleTips: {
          foods: Array.isArray(parsed.lifestyleTips?.foods) ? parsed.lifestyleTips.foods : fallbackTips.foods,
          habits: Array.isArray(parsed.lifestyleTips?.habits) ? parsed.lifestyleTips.habits : fallbackTips.habits,
        },
        seasonTip: parsed.seasonTip || t.seasonTips[seasonKey] || t.seasonTips.default,
        disclaimer: t.disclaimer,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      console.error('AI processing error:', aiError);
      console.warn('Using rule-based fallback for subject:', aiSubjectId);
      const analysis = generateRuleBasedAnalysis(yesterdayScore, currentSeason, lang);
      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Daily analysis error:', error);
    return new Response(JSON.stringify({ 
      error: 'Something went wrong',
      hasYesterdayData: false,
      disclaimer: 'This information is educational and not medical advice.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
