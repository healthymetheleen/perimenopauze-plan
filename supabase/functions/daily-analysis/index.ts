import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Orthomoleculaire tips per seizoen en tekort
const orthomolecularTips: Record<string, { minerals: string[]; foods: string[]; avoid: string[] }> = {
  winter: {
    minerals: ['IJzer (ferritine)', 'Vitamine C', 'B12', 'Magnesium'],
    foods: ['Spinazie, rode biet, lever', 'Paprika, kiwi, broccoli', 'Eieren, vis, vlees', 'Pompoenpitten, donkere chocolade'],
    avoid: ['Koffie bij maaltijden (remt ijzeropname)', 'Zuivel bij ijzerrijke maaltijden'],
  },
  lente: {
    minerals: ['Zink', 'B-vitamines', 'Omega-3'],
    foods: ['Oesters, pompoenpitten, vlees', 'Volkoren granen, eieren, groene bladgroenten', 'Vette vis (zalm, makreel), walnoten'],
    avoid: ['Geraffineerde suikers', 'Alcohol in grote hoeveelheden'],
  },
  zomer: {
    minerals: ['Elektrolyten (natrium, kalium)', 'Vitamine D', 'Antioxidanten'],
    foods: ['Banaan, kokoswater, zout in maaltijden', 'Zonlicht + vette vis', 'Bessen, donkere groenten, groene thee'],
    avoid: ['Te weinig zout bij zweten', 'Uitdroging door koffie/alcohol'],
  },
  herfst: {
    minerals: ['Magnesium', 'B6', 'Tryptofaan (voor serotonine)'],
    foods: ['Noten, zaden, donkere chocolade', 'Kip, vis, banaan, kikkererwten', 'Kalkoen, kaas, havermout, noten'],
    avoid: ['Suiker en alcohol (verergeren PMS)', 'Caffeine na 14:00 (verstoort slaap)'],
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

    console.log('Fetching daily analysis for user:', user.id);

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get yesterday's nutrition data
    const { data: yesterdayScore } = await supabase
      .from('v_daily_scores')
      .select('*')
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
    const tips = orthomolecularTips[currentSeason] || orthomolecularTips.lente;

    // Build analysis
    const analysis: {
      hasYesterdayData: boolean;
      yesterdaySummary: string | null;
      highlights: string[];
      improvements: string[];
      orthomolecular: {
        minerals: string[];
        foods: string[];
        avoid: string[];
      };
      seasonTip: string;
    } = {
      hasYesterdayData: !!yesterdayScore && yesterdayScore.meals_count > 0,
      yesterdaySummary: null,
      highlights: [],
      improvements: [],
      orthomolecular: tips,
      seasonTip: '',
    };

    if (yesterdayScore && yesterdayScore.meals_count > 0) {
      const kcal = yesterdayScore.kcal_total || 0;
      const protein = yesterdayScore.protein_g || 0;
      const fiber = yesterdayScore.fiber_g || 0;
      const meals = yesterdayScore.meals_count || 0;

      analysis.yesterdaySummary = `${meals} maaltijden · ${Math.round(kcal)} kcal · ${Math.round(protein)}g eiwit · ${Math.round(fiber)}g vezels`;

      // Highlights (positive)
      if (protein >= 50) {
        analysis.highlights.push('✓ Goed eiwitinname (50g+)');
      }
      if (fiber >= 25) {
        analysis.highlights.push('✓ Uitstekende vezelinname (25g+)');
      }
      if (meals >= 3) {
        analysis.highlights.push('✓ Regelmatig gegeten');
      }

      // Improvements
      if (protein < 40) {
        analysis.improvements.push(`Eiwit was ${Math.round(protein)}g - probeer 50g+ voor spieren & energie`);
      }
      if (fiber < 20) {
        analysis.improvements.push(`Vezels waren ${Math.round(fiber)}g - streef naar 25g+ voor darmen`);
      }
      if (meals < 2) {
        analysis.improvements.push('Slechts 1 maaltijd gelogd - regelmatig eten stabiliseert je bloedsuiker');
      }
    }

    // Season-specific tip
    switch (currentSeason) {
      case 'winter':
        analysis.seasonTip = 'Focus op ijzerrijk eten en rust. Je lichaam herstelt nu.';
        break;
      case 'lente':
        analysis.seasonTip = 'Ideale tijd voor verse, gevarieerde maaltijden. Je stofwisseling is optimaal.';
        break;
      case 'zomer':
        analysis.seasonTip = 'Licht en voedzaam eten, veel water. Je energie is op z\'n piek!';
        break;
      case 'herfst':
        analysis.seasonTip = 'Stabiele maaltijdtijden zijn cruciaal. Vermijd suiker en alcohol.';
        break;
      default:
        analysis.seasonTip = 'Log je cyclus om seizoensgebonden tips te ontvangen.';
    }

    console.log('Returning daily analysis');

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Daily analysis error:', error);
    return new Response(JSON.stringify({ 
      error: 'Er ging iets mis',
      hasYesterdayData: false,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
