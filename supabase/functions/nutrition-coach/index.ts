import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      console.log('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized', tips: [] }), {
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
    const currentSeason = prediction?.current_season || 'onbekend';

    // Check if nutrition focus is enabled (default true)
    const focusNutrition = coachingPrefs?.focus_nutrition ?? true;
    const focusCycle = coachingPrefs?.focus_cycle ?? true;

    console.log('Scores found:', scores?.length || 0, 'Season:', currentSeason);

    if (!scores || scores.length === 0) {
      tips.push('Start met het loggen van je maaltijden voor persoonlijke coaching');
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
        tips.push(`Je gemiddelde eiwit is ${Math.round(avgProtein)}g/dag. Probeer minimaal 50g voor energie en spieren.`);
        tips.push('Tip: voeg eieren, vis, peulvruchten of Griekse yoghurt toe aan je maaltijden.');
      } else if (avgProtein >= 50) {
        tips.push(`Goed bezig! Je eet gemiddeld ${Math.round(avgProtein)}g eiwit per dag 💪`);
      }

      // Fiber coaching
      if (avgFiber < 20) {
        tips.push(`Je vezelintake (${Math.round(avgFiber)}g/dag) is onder de aanbevolen 25g.`);
        tips.push('Tip: meer groenten, volkoren producten en fruit helpen je spijsvertering.');
      } else if (avgFiber >= 25) {
        tips.push(`Uitstekende vezels! ${Math.round(avgFiber)}g/dag houdt je darmen gezond 🥗`);
      }

      // Meal regularity
      if (avgMeals < 2) {
        tips.push('Je logt weinig maaltijden. Regelmatig eten houdt je bloedsuiker stabiel.');
      }
    }

    // Season-specific tips (only if cycle focus is enabled)
    if (focusCycle) {
      switch (currentSeason) {
        case 'winter':
          tips.push('Winter fase: kies voor warme, voedzame maaltijden');
          if (focusNutrition && avgProtein < 50) {
            tips.push('Eiwit bij je maaltijden helpt bij herstel');
          }
          break;
        case 'lente':
          tips.push('Lente fase: je lichaam verwerkt koolhydraten nu optimaal');
          tips.push('Ideale tijd voor gevarieerde, verse maaltijden');
          break;
        case 'zomer':
          tips.push('Zomer fase: licht maar voedzaam eten, extra hydratatie');
          tips.push('Je energie is op z\'n piek - geniet ervan!');
          break;
        case 'herfst':
          tips.push('Herfst fase: stabiele maaltijdtijden zijn cruciaal');
          tips.push('Vermijd veel suiker en alcohol om PMS te verminderen');
          if (focusNutrition && avgFiber < 20) {
            tips.push('Extra magnesium (noten, zaden) kan helpen bij spanning');
          }
          break;
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
      error: 'Er ging iets mis',
      tips: [],
      currentSeason: 'onbekend'
    }), {
      status: 200, // Return 200 with empty tips instead of 500
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});