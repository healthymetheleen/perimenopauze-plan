import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Privacy-compliant: generate AI subject ID (not reversible without DB)
function generateAISubjectId(userId: string): string {
  let hash = 0;
  const salt = 'ai_subject_v1_';
  const input = salt + userId;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `subj_${hex}`;
}

// Convert to relative day (D0 = today, D-1 = yesterday)
function toRelativeDay(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'D0';
  if (diffDays > 0) return `D+${diffDays}`;
  return `D${diffDays}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate pseudonymous subject ID (never send real user_id to AI)
    const aiSubjectId = generateAISubjectId(user.id);

    // Check if we have a cached insight from this week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const { data: cachedInsight } = await supabaseClient
      .from('ai_insights_cache')
      .select('*')
      .eq('owner_id', user.id)
      .eq('insight_type', 'weekly_nutrition')
      .gte('insight_date', weekStartStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedInsight) {
      console.log("Returning cached weekly insight for", aiSubjectId);
      return new Response(JSON.stringify({ insight: cachedInsight.insight_data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch last 7 days of nutrition data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: dailyScores, error: scoresError } = await supabaseClient
      .from('v_daily_scores')
      .select('day_date, meals_count, kcal_total, protein_g, fiber_g, carbs_g, score_reasons')
      .eq('owner_id', user.id)
      .gte('day_date', sevenDaysAgoStr)
      .order('day_date', { ascending: true });

    if (scoresError) {
      console.error("Error fetching scores for", aiSubjectId, ":", scoresError);
      throw scoresError;
    }

    // Check if we have enough data
    if (!dailyScores || dailyScores.length < 3) {
      return new Response(JSON.stringify({ 
        error: "Niet genoeg data", 
        message: "Log minimaal 3 dagen met maaltijden om een weekanalyse te krijgen." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PRIVACY: Build minimal context pack with relative days, no PII
    const daysWithMeals = dailyScores.filter(d => d.meals_count > 0);
    const totalMeals = daysWithMeals.reduce((sum, d) => sum + (d.meals_count || 0), 0);
    const avgKcal = daysWithMeals.length > 0 
      ? daysWithMeals.reduce((sum, d) => sum + (d.kcal_total || 0), 0) / daysWithMeals.length 
      : 0;
    const avgProtein = daysWithMeals.length > 0 
      ? daysWithMeals.reduce((sum, d) => sum + (d.protein_g || 0), 0) / daysWithMeals.length 
      : 0;
    const avgFiber = daysWithMeals.length > 0 
      ? daysWithMeals.reduce((sum, d) => sum + (d.fiber_g || 0), 0) / daysWithMeals.length 
      : 0;
    const avgCarbs = daysWithMeals.length > 0 
      ? daysWithMeals.reduce((sum, d) => sum + (d.carbs_g || 0), 0) / daysWithMeals.length 
      : 0;

    // Collect all score reasons (categorical, no PII)
    const allReasons = dailyScores.flatMap(d => d.score_reasons || []);
    const reasonCounts: Record<string, number> = {};
    allReasons.forEach(r => {
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });

    // Build MINIMAL CONTEXT PACK with relative days (no dates)
    const dailyPatterns = daysWithMeals.map(d => ({
      relDay: toRelativeDay(d.day_date),
      meals: d.meals_count,
      proteinCategory: (d.protein_g || 0) < 40 ? 'laag' : (d.protein_g || 0) < 60 ? 'gemiddeld' : 'goed',
      fiberCategory: (d.fiber_g || 0) < 20 ? 'laag' : (d.fiber_g || 0) < 30 ? 'gemiddeld' : 'goed',
    }));

    const nutritionSummary = `
WEEKOVERZICHT VOEDING (${daysWithMeals.length} dagen gelogd):
- Totaal maaltijden: ${totalMeals}
- Gemiddeld per dag: ~${Math.round(avgKcal)} kcal, ~${Math.round(avgProtein)}g eiwit, ~${Math.round(avgFiber)}g vezels, ~${Math.round(avgCarbs)}g koolhydraten
- Patronen: ${Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([r, c]) => `${r} (${c}x)`).join(', ')}
- Dagpatronen: ${dailyPatterns.map(d => `${d.relDay}: ${d.meals} maaltijden, eiwit ${d.proteinCategory}`).join('; ')}
    `.trim();

    const systemPrompt = `Je bent een voedingscoach die vrouwen helpt met leefstijl en voeding. 
Je geeft warme, persoonlijke adviezen gebaseerd op voedingspatronen.

BELANGRIJK:
- Je bent GEEN arts en geeft GEEN medisch advies
- Noem NOOIT supplementen, vitamines of mineralen
- Gebruik relatieve dagen (D-1 = gisteren, D-2 = eergisteren)
- Geef alleen leefstijl en voedingstips, geen diagnoses

Focus op:
- Gevarieerd eten met voldoende groenten en fruit
- Stabiele bloedsuiker door regelmatige maaltijden
- Voldoende eiwit bij elke maaltijd
- Slaap en ontspanning
- Vezels en gevarieerde voeding

Geef concrete, haalbare tips. Vermijd medisch jargon. Schrijf in het Nederlands.`;

    const userPrompt = `Analyseer deze weekelijkse voedingsdata en geef een persoonlijk weekadvies:

${nutritionSummary}

Geef je analyse in dit exact JSON format:
{
  "samenvatting": "Korte samenvatting van de week in 1-2 zinnen",
  "sterke_punten": ["punt 1", "punt 2"],
  "aandachtspunten": ["punt 1", "punt 2"],
  "leefstijl_tip": {
    "titel": "Concrete tip voor deze week",
    "uitleg": "Waarom dit helpt",
    "voedingsmiddelen": ["voedingsmiddel 1", "voedingsmiddel 2", "voedingsmiddel 3"]
  },
  "weekdoel": "Één specifiek, haalbaar doel voor komende week"
}`;

    // Use direct OpenAI API for full control and GDPR compliance
    const OPENAI_API_KEY = Deno.env.get("ChatGPT");
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    console.log("Calling OpenAI API for weekly nutrition insight, subject:", aiSubjectId);

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenAI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("OpenAI API error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let insight;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      insight = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response for", aiSubjectId, ":", content);
      insight = {
        samenvatting: "Analyse kon niet worden voltooid.",
        sterke_punten: [],
        aandachtspunten: [],
        ortho_tip: null,
        weekdoel: "Blijf je maaltijden loggen voor betere inzichten.",
      };
    }

    // Add metadata (no PII)
    insight.week_start = weekStartStr;
    insight.days_logged = daysWithMeals.length;
    insight.avg_protein = Math.round(avgProtein);
    insight.avg_fiber = Math.round(avgFiber);
    insight.avg_kcal = Math.round(avgKcal);
    insight.disclaimer = "Deze inzichten zijn informatief en geen medisch advies.";

    // Cache the insight (linked to real user_id in our DB only)
    const { error: cacheError } = await supabaseClient
      .from('ai_insights_cache')
      .insert({
        owner_id: user.id,
        insight_type: 'weekly_nutrition',
        insight_date: today.toISOString().split('T')[0],
        insight_data: insight,
      });

    if (cacheError) {
      console.error("Failed to cache insight for", aiSubjectId, ":", cacheError);
    }

    console.log("Successfully generated weekly nutrition insight for", aiSubjectId);

    return new Response(JSON.stringify({ insight, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in weekly-nutrition-insight:", error);
    const message = error instanceof Error ? error.message : "Er ging iets mis";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
