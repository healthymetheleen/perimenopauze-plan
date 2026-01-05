import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Leefstijltips per seizoen (geen medische claims of supplementadvies)
const seasonLifestyleTips: Record<string, { foods: string[]; habits: string[] }> = {
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
    const tips = seasonLifestyleTips[currentSeason] || seasonLifestyleTips.lente;

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
      disclaimer: 'Deze informatie is educatief en geen medisch advies.',
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
        analysis.seasonTip = 'Focus op warme, voedzame maaltijden en rust. Je lichaam herstelt nu.';
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

    console.log('Returning daily analysis for subject:', aiSubjectId);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Daily analysis error:', error);
    return new Response(JSON.stringify({ 
      error: 'Er ging iets mis',
      hasYesterdayData: false,
      disclaimer: 'Deze informatie is educatief en geen medisch advies.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
