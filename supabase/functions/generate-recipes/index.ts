import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getPrompt, SupportedLanguage } from "../_shared/prompts.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getLanguage(lang?: string): SupportedLanguage {
  if (lang === 'en') return 'en';
  return 'nl';
}

// Fallback system prompts (used if database fetch fails)
const fallbackSystemPrompts = {
  nl: (count: number) => `Je bent een orthomoleculair voedingsexpert gespecialiseerd in KPNI (Klinische PsychoNeuroImmunologie) en functional medicine voor vrouwen in de perimenopauze.

BELANGRIJKE TAALREGEL: Genereer ALLES in het Nederlands. Geen Engelse termen.
- "ijzerrijk" in plaats van "iron-rich"
- "eiwitrijk" in plaats van "protein-rich"  
- "vezelrijk" in plaats van "fiber-rich"
- "anti-inflammatoir" in plaats van "anti-inflammatory"
- "bloedsuikerstabiel" in plaats van "blood sugar stable"
Alle titels, beschrijvingen, ingrediënten en instructies moeten volledig in het Nederlands zijn.

VOEDINGSFILOSOFIE (ALTIJD TOEPASSEN):
- Focus op groenten en eiwitten, koolhydraatarm
- Pseudogranen (quinoa, boekweit, amarant) in plaats van reguliere granen
- 25-40 gram eiwit per maaltijd
- 8-12 gram vezels per maaltijd
- Puur, onbewerkt en biologisch
- Vlees/zuivel: grasgevoerd en biologisch
- Zuivel: rauwe zuivel, kefir, gefermenteerde producten
- Inclusief kiemen en gefermenteerde voeding
- Fruit mag: vers seizoensfruit, bessen, appels, peren (met mate, bij voorkeur met eiwit/vet)
- Minimaal peulvruchten (beperkt gebruik)
- Vis: alleen zalm en kleiner (makreel, sardines, haring) vanwege gifstoffen
- 100% suikervrij - GEEN toegevoegde suiker en GEEN suikeralternatieven (geen honing, agave, stevia, etc.)
- Geen bewerkte voeding, geen E-nummers

Genereer ${count} recepten in JSON format.

Retourneer ALLEEN een JSON array met de recepten, geen extra tekst.`,

  en: (count: number) => `You are an orthomolecular nutrition expert specialized in KPNI (Clinical PsychoNeuroImmunology) and functional medicine for women in perimenopause.

IMPORTANT LANGUAGE RULE: Generate EVERYTHING in English.
- Use terms like "iron-rich", "protein-rich", "fiber-rich", "anti-inflammatory", "blood sugar stable"
All titles, descriptions, ingredients and instructions must be completely in English.

NUTRITION PHILOSOPHY (ALWAYS APPLY):
- Focus on vegetables and proteins, low-carb
- Pseudograins (quinoa, buckwheat, amaranth) instead of regular grains
- 25-40 grams protein per meal
- 8-12 grams fiber per meal
- Pure, unprocessed and organic
- Meat/dairy: grass-fed and organic
- Dairy: raw dairy, kefir, fermented products
- Including sprouts and fermented foods
- Fruit allowed: fresh seasonal fruit, berries, apples, pears (in moderation, preferably with protein/fat)
- Minimal legumes (limited use)
- Fish: only salmon and smaller (mackerel, sardines, herring) due to toxins
- 100% sugar-free - NO added sugar and NO sugar alternatives (no honey, agave, stevia, etc.)
- No processed foods, no E-numbers

Generate ${count} recipes in JSON format.

Return ONLY a JSON array with the recipes, no extra text.`,
};

const errorMessages = {
  nl: {
    promptTooShort: 'Prompt moet minimaal 5 karakters zijn',
    tooManyRequests: 'Te veel verzoeken, probeer het later opnieuw.',
    noCredits: 'Krediet op, voeg tegoed toe aan je workspace.',
    serviceUnavailable: 'AI service niet beschikbaar',
    noResponse: 'Geen response van AI',
    parseError: 'Kon recepten niet parsen uit AI response',
    unknown: 'Onbekende fout',
  },
  en: {
    promptTooShort: 'Prompt must be at least 5 characters',
    tooManyRequests: 'Too many requests, please try again later.',
    noCredits: 'No credits left, add balance to your workspace.',
    serviceUnavailable: 'AI service unavailable',
    noResponse: 'No response from AI',
    parseError: 'Could not parse recipes from AI response',
    unknown: 'Unknown error',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, count = 5, language } = await req.json();
    const lang = getLanguage(language);
    const t = errorMessages[lang];
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!prompt || typeof prompt !== 'string' || prompt.length < 5) {
      return new Response(
        JSON.stringify({ error: t.promptTooShort }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating ${count} recipes with prompt: ${prompt}, language: ${lang}`);

    // Fetch dynamic system prompt from database
    const fallbackPrompt = fallbackSystemPrompts[lang](count);
    let systemPrompt = await getPrompt('generate_recipes_system', lang, fallbackPrompt);
    
    // Replace {{count}} placeholder if present
    systemPrompt = systemPrompt.replace(/\{\{count\}\}/g, String(count));

    const userPrompt = `${prompt}

CRITICAL: Respond with ONLY a valid JSON array. No text before or after. Start directly with [ and end with ]. Example format:
[{"title":"...","description":"...","meal_type":"breakfast|lunch|dinner|snack","ingredients":[{"amount":"...","item":"..."}],"instructions":"...","prep_time_minutes":5,"cook_time_minutes":10,"servings":2,"protein_g":25,"fiber_g":8,"kcal":350,"carbs_g":20,"fat_g":15,"diet_tags":["vegetarian"],"seasons":["winter","spring"],"cycle_phases":["menstrual","follicular"]}]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: t.tooManyRequests }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: t.noCredits }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(t.serviceUnavailable);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error(t.noResponse);
    }

    console.log("Raw AI response:", content);

    let recipes;
    try {
      let jsonStr = content;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\s*/g, '');
      }
      recipes = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(t.parseError);
    }

    if (!Array.isArray(recipes)) {
      recipes = [recipes];
    }

    const validRecipes = recipes.filter((r: any) => 
      r.title && r.instructions && r.meal_type && Array.isArray(r.ingredients)
    );

    console.log(`Generated ${validRecipes.length} valid recipes`);

    return new Response(
      JSON.stringify({ recipes: validRecipes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-recipes:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});