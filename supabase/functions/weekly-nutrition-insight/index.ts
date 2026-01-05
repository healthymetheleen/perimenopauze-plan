import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      console.log("Returning cached weekly insight");
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
      .select('*')
      .eq('owner_id', user.id)
      .gte('day_date', sevenDaysAgoStr)
      .order('day_date', { ascending: true });

    if (scoresError) {
      console.error("Error fetching scores:", scoresError);
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

    // Calculate weekly totals and averages
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

    // Collect all score reasons
    const allReasons = dailyScores.flatMap(d => d.score_reasons || []);
    const reasonCounts: Record<string, number> = {};
    allReasons.forEach(r => {
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });

    // Build prompt for AI
    const nutritionSummary = `
Weekoverzicht voeding (${daysWithMeals.length} dagen gelogd):
- Totaal maaltijden: ${totalMeals}
- Gemiddeld per dag: ${Math.round(avgKcal)} kcal, ${Math.round(avgProtein)}g eiwit, ${Math.round(avgFiber)}g vezels, ${Math.round(avgCarbs)}g koolhydraten
- Veelvoorkomende patronen: ${Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([r, c]) => `${r} (${c}x)`).join(', ')}
    `.trim();

    const systemPrompt = `Je bent een orthomoleculair voedingscoach gespecialiseerd in de perimenopauze. 
Je geeft warme, persoonlijke adviezen op basis van de KNMP orthomoleculaire voedingsleer.
Focus op:
- Hormoonbalans door voeding (fytooestrogenen, omega-3, B-vitamines)
- Bloedsuikerregulatie voor stabiele energie en stemming
- Botten en spieren (calcium, vitamine D, magnesium, eiwit)
- Slaap en ontspanning (tryptofaan, magnesium)
- Darmgezondheid en hormoonafvoer (vezels, probiotica)

Geef concrete, haalbare tips. Vermijd medisch jargon. Schrijf in het Nederlands.`;

    const userPrompt = `Analyseer deze weekelijkse voedingsdata en geef een persoonlijk weekadvies:

${nutritionSummary}

Geef je analyse in dit exact JSON format:
{
  "samenvatting": "Korte samenvatting van de week in 1-2 zinnen",
  "sterke_punten": ["punt 1", "punt 2"],
  "aandachtspunten": ["punt 1", "punt 2"],
  "ortho_tip": {
    "titel": "Concrete orthomoleculaire tip voor deze week",
    "uitleg": "Waarom dit helpt in de perimenopauze",
    "voedingsmiddelen": ["voedingsmiddel 1", "voedingsmiddel 2", "voedingsmiddel 3"]
  },
  "weekdoel": "Één specifiek, haalbaar doel voor komende week"
}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Calling Lovable AI for weekly nutrition insight...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI-tegoed op, neem contact op met support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let insight;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      insight = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      insight = {
        samenvatting: "Analyse kon niet worden voltooid.",
        sterke_punten: [],
        aandachtspunten: [],
        ortho_tip: null,
        weekdoel: "Blijf je maaltijden loggen voor betere inzichten.",
      };
    }

    // Add metadata
    insight.week_start = weekStartStr;
    insight.days_logged = daysWithMeals.length;
    insight.avg_protein = Math.round(avgProtein);
    insight.avg_fiber = Math.round(avgFiber);
    insight.avg_kcal = Math.round(avgKcal);

    // Cache the insight
    const { error: cacheError } = await supabaseClient
      .from('ai_insights_cache')
      .insert({
        owner_id: user.id,
        insight_type: 'weekly_nutrition',
        insight_date: today.toISOString().split('T')[0],
        insight_data: insight,
      });

    if (cacheError) {
      console.error("Failed to cache insight:", cacheError);
    }

    console.log("Successfully generated weekly nutrition insight");

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
