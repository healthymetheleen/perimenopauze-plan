import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

type SupportedLanguage = 'nl' | 'en';

function getLanguage(lang?: string): SupportedLanguage {
  if (lang === 'en') return 'en';
  return 'nl';
}

const translations = {
  nl: {
    unauthorized: 'Unauthorized',
    startLogging: 'Start met het loggen van je maaltijden voor persoonlijke coaching',
    proteinLow: (avg: number) => `Je gemiddelde eiwit is ${avg}g/dag. Probeer minimaal 50g voor energie en spieren.`,
    proteinTip: 'Tip: voeg eieren, vis, peulvruchten of Griekse yoghurt toe aan je maaltijden.',
    proteinGood: (avg: number) => `Goed bezig! Je eet gemiddeld ${avg}g eiwit per dag 💪`,
    fiberLow: (avg: number) => `Je vezelintake (${avg}g/dag) is onder de aanbevolen 25g.`,
    fiberTip: 'Tip: meer groenten, volkoren producten en fruit helpen je spijsvertering.',
    fiberGood: (avg: number) => `Uitstekende vezels! ${avg}g/dag houdt je darmen gezond 🥗`,
    fewMeals: 'Je logt weinig maaltijden. Regelmatig eten houdt je bloedsuiker stabiel.',
    seasons: {
      winter: {
        main: 'Winter fase: kies voor warme, voedzame maaltijden',
        proteinTip: 'Eiwit bij je maaltijden helpt bij herstel',
      },
      lente: {
        main: 'Lente fase: je lichaam verwerkt koolhydraten nu optimaal',
        secondary: 'Ideale tijd voor gevarieerde, verse maaltijden',
      },
      zomer: {
        main: 'Zomer fase: licht maar voedzaam eten, extra hydratatie',
        secondary: 'Je energie is op z\'n piek - geniet ervan!',
      },
      herfst: {
        main: 'Herfst fase: stabiele maaltijdtijden zijn cruciaal',
        secondary: 'Vermijd veel suiker en alcohol om PMS te verminderen',
        fiberTip: 'Extra magnesium (noten, zaden) kan helpen bij spanning',
      },
    },
    error: 'Er ging iets mis',
    unknown: 'onbekend',
  },
  en: {
    unauthorized: 'Unauthorized',
    startLogging: 'Start logging your meals for personalized coaching',
    proteinLow: (avg: number) => `Your average protein is ${avg}g/day. Try at least 50g for energy and muscles.`,
    proteinTip: 'Tip: add eggs, fish, legumes or Greek yogurt to your meals.',
    proteinGood: (avg: number) => `Great job! You eat an average of ${avg}g protein per day 💪`,
    fiberLow: (avg: number) => `Your fiber intake (${avg}g/day) is below the recommended 25g.`,
    fiberTip: 'Tip: more vegetables, whole grains and fruit help your digestion.',
    fiberGood: (avg: number) => `Excellent fiber! ${avg}g/day keeps your gut healthy 🥗`,
    fewMeals: 'You log few meals. Regular eating keeps your blood sugar stable.',
    seasons: {
      winter: {
        main: 'Winter phase: choose warm, nutritious meals',
        proteinTip: 'Protein with your meals helps with recovery',
      },
      lente: {
        main: 'Spring phase: your body processes carbs optimally now',
        secondary: 'Ideal time for varied, fresh meals',
      },
      zomer: {
        main: 'Summer phase: light but nutritious eating, extra hydration',
        secondary: 'Your energy is at its peak - enjoy it!',
      },
      herfst: {
        main: 'Autumn phase: stable meal times are crucial',
        secondary: 'Avoid excess sugar and alcohol to reduce PMS',
        fiberTip: 'Extra magnesium (nuts, seeds) can help with tension',
      },
    },
    error: 'Something went wrong',
    unknown: 'unknown',
  },
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('No auth header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized', tips: [] }), {
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
      console.log('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: t.unauthorized, tips: [] }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching nutrition data for user:', user.id);

    // Get last 7 days of nutrition data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const { data: scores, error: scoresError } = await supabase
      .from('v_daily_scores')
      .select('*')
      .eq('owner_id', user.id)
      .gte('day_date', startDate)
      .order('day_date', { ascending: false });

    if (scoresError) {
      console.log('Scores query error:', scoresError.message);
    }

    // Get cycle prediction
    const { data: prediction, error: predError } = await supabase
      .from('cycle_predictions')
      .select('current_season, current_phase')
      .eq('owner_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (predError) {
      console.log('Prediction query error:', predError.message);
    }

    // Get coaching preferences
    const { data: coachingPrefs } = await supabase
      .from('coaching_preferences')
      .select('focus_nutrition, focus_sleep, focus_cycle, focus_movement, focus_stress, focus_symptoms, personal_context')
      .eq('owner_id', user.id)
      .maybeSingle();

    // Generate coaching tips based on data
    const tips: string[] = [];
    const currentSeason = prediction?.current_season || t.unknown;

    // Check if nutrition focus is enabled (default true)
    const focusNutrition = coachingPrefs?.focus_nutrition ?? true;
    const focusCycle = coachingPrefs?.focus_cycle ?? true;

    console.log('Scores found:', scores?.length || 0, 'Season:', currentSeason);

    if (!scores || scores.length === 0) {
      tips.push(t.startLogging);
      return new Response(JSON.stringify({ tips, currentSeason }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate averages
    const avgProtein = scores.reduce((sum, s) => sum + (s.protein_g || 0), 0) / scores.length;
    const avgFiber = scores.reduce((sum, s) => sum + (s.fiber_g || 0), 0) / scores.length;
    const avgKcal = scores.reduce((sum, s) => sum + (s.kcal_total || 0), 0) / scores.length;
    const avgMeals = scores.reduce((sum, s) => sum + (s.meals_count || 0), 0) / scores.length;

    // Only provide nutrition tips if focus is enabled
    if (focusNutrition) {
      // Protein coaching
      if (avgProtein < 40) {
        tips.push(t.proteinLow(Math.round(avgProtein)));
        tips.push(t.proteinTip);
      } else if (avgProtein >= 50) {
        tips.push(t.proteinGood(Math.round(avgProtein)));
      }

      // Fiber coaching
      if (avgFiber < 20) {
        tips.push(t.fiberLow(Math.round(avgFiber)));
        tips.push(t.fiberTip);
      } else if (avgFiber >= 25) {
        tips.push(t.fiberGood(Math.round(avgFiber)));
      }

      // Meal regularity
      if (avgMeals < 2) {
        tips.push(t.fewMeals);
      }
    }

    // Season-specific tips (only if cycle focus is enabled)
    if (focusCycle) {
      const seasonKey = currentSeason as keyof typeof t.seasons;
      const seasonTips = t.seasons[seasonKey];
      
      if (seasonTips) {
        tips.push(seasonTips.main);
        if ('secondary' in seasonTips) {
          tips.push(seasonTips.secondary);
        }
        if ('proteinTip' in seasonTips && focusNutrition && avgProtein < 50) {
          tips.push(seasonTips.proteinTip);
        }
        if ('fiberTip' in seasonTips && focusNutrition && avgFiber < 20) {
          tips.push(seasonTips.fiberTip);
        }
      }
    }

    console.log('Returning tips:', tips.length);

    return new Response(JSON.stringify({ 
      tips: tips.slice(0, 5), // Max 5 tips
      currentSeason,
      stats: {
        avgProtein: Math.round(avgProtein),
        avgFiber: Math.round(avgFiber),
        avgKcal: Math.round(avgKcal),
        daysLogged: scores.length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Nutrition coach error:', error);
    return new Response(JSON.stringify({ 
      error: 'Something went wrong',
      tips: [],
      currentSeason: 'unknown'
    }), {
      status: 200, // Return 200 with empty tips instead of 500
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
