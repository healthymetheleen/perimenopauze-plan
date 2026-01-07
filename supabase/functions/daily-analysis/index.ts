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

// Lifestyle tips per season
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
    const tips = seasonLifestyleTips[lang][currentSeason as keyof typeof seasonLifestyleTips.nl] || seasonLifestyleTips[lang].lente;

    // Build analysis with CATEGORICAL data only (no exact values in logs)
    const analysis: {
      hasYesterdayData: boolean;
      yesterdaySummary: string | null;
      highlights: string[];
      improvements: string[];
      lifestyleTips: {
        foods: string[];
        habits: string[];
      };
      seasonTip: string;
      disclaimer: string;
    } = {
      hasYesterdayData: !!yesterdayScore && yesterdayScore.meals_count > 0,
      yesterdaySummary: null,
      highlights: [],
      improvements: [],
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

      // Highlights (positive)
      if (protein >= 50) {
        analysis.highlights.push(t.highlights.protein);
      }
      if (fiber >= 25) {
        analysis.highlights.push(t.highlights.fiber);
      }
      if (meals >= 3) {
        analysis.highlights.push(t.highlights.meals);
      }

      // Improvements
      if (protein < 40) {
        analysis.improvements.push(t.improvements.protein(Math.round(protein)));
      }
      if (fiber < 20) {
        analysis.improvements.push(t.improvements.fiber(Math.round(fiber)));
      }
      if (meals < 2) {
        analysis.improvements.push(t.improvements.meals);
      }
    }

    // Season-specific tip
    const seasonKey = currentSeason as keyof typeof t.seasonTips;
    analysis.seasonTip = t.seasonTips[seasonKey] || t.seasonTips.default;

    console.log('Returning daily analysis for subject:', aiSubjectId);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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
