import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getPrompt, SupportedLanguage } from "../_shared/prompts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getLanguage(lang?: string): SupportedLanguage {
  if (lang === 'en') return 'en';
  return 'nl';
}

// Get weather season based on month and hemisphere
function getWeatherSeason(hemisphere: 'north' | 'south' = 'north'): string {
  const month = new Date().getMonth(); // 0-11
  if (hemisphere === 'north') {
    if (month >= 2 && month <= 4) return 'lente';
    if (month >= 5 && month <= 7) return 'zomer';
    if (month >= 8 && month <= 10) return 'herfst';
    return 'winter';
  } else {
    // Southern hemisphere - opposite seasons
    if (month >= 2 && month <= 4) return 'herfst';
    if (month >= 5 && month <= 7) return 'winter';
    if (month >= 8 && month <= 10) return 'lente';
    return 'zomer';
  }
}

// Get meal type based on current hour
function getMealTypeFromTime(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'ontbijt';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'tussendoortje';
  if (hour >= 18 && hour < 22) return 'diner';
  return 'snack';
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

interface NutritionSettings {
  avoid_ingredients: string[];
  prefer_ingredients: string[];
  no_go_items: string[];
  perimenopause_focus: string[];
  target_protein_g: number | null;
  target_fiber_g: number | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt, 
      count = 5, 
      language, 
      mealType,
      weatherSeason,
      cyclePhase,
      dietTags,
      hemisphere = 'north'
    } = await req.json();
    
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

    // Get auth token to fetch user preferences
    const authHeader = req.headers.get('Authorization');
    let nutritionSettings: NutritionSettings | null = null;
    let userCyclePhase: string | null = null;
    
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } }
        });

        // Get user from JWT
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Fetch nutrition settings
          const { data: settings } = await supabase
            .from('nutrition_settings')
            .select('avoid_ingredients, prefer_ingredients, no_go_items, perimenopause_focus, target_protein_g, target_fiber_g')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();
          
          if (settings) {
            nutritionSettings = {
              avoid_ingredients: Array.isArray(settings.avoid_ingredients) ? settings.avoid_ingredients : [],
              prefer_ingredients: Array.isArray(settings.prefer_ingredients) ? settings.prefer_ingredients : [],
              no_go_items: Array.isArray(settings.no_go_items) ? settings.no_go_items : [],
              perimenopause_focus: Array.isArray(settings.perimenopause_focus) ? settings.perimenopause_focus : [],
              target_protein_g: settings.target_protein_g,
              target_fiber_g: settings.target_fiber_g,
            };
            console.log('Loaded nutrition settings:', nutritionSettings);
          }
          
          // Fetch user's cycle phase
          const { data: prediction } = await supabase
            .from('cycle_predictions')
            .select('current_season')
            .eq('owner_id', user.id)
            .order('generated_at', { ascending: false })
            .limit(1)
            .single();
          
          if (prediction?.current_season) {
            // Map season to cycle phase
            const seasonToPhase: Record<string, string> = {
              winter: 'menstruatie',
              lente: 'folliculair',
              zomer: 'ovulatie',
              herfst: 'luteaal',
            };
            userCyclePhase = seasonToPhase[prediction.current_season] || null;
            console.log('User cycle phase:', userCyclePhase);
          }
        }
      } catch (e) {
        console.log('Could not fetch user preferences:', e);
      }
    }

    // Auto-detect values if not provided
    const effectiveMealType = mealType || getMealTypeFromTime();
    const effectiveWeatherSeason = weatherSeason || getWeatherSeason(hemisphere);
    const effectiveCyclePhase = cyclePhase || userCyclePhase;

    console.log(`Generating ${count} recipes with prompt: ${prompt}, language: ${lang}`);
    console.log(`Context: mealType=${effectiveMealType}, season=${effectiveWeatherSeason}, cyclePhase=${effectiveCyclePhase}, dietTags=${dietTags}`);

    // Fetch dynamic system prompt from database
    const fallbackPrompt = fallbackSystemPrompts[lang](count);
    let systemPrompt = await getPrompt('generate_recipes_system', lang, fallbackPrompt);
    
    // Replace {{count}} placeholder if present
    systemPrompt = systemPrompt.replace(/\{\{count\}\}/g, String(count));

    // Build context from user preferences
    let contextInstructions = '';
    
    if (nutritionSettings) {
      const contextParts = [];
      
      if (nutritionSettings.avoid_ingredients.length > 0) {
        contextParts.push(`VERMIJD deze ingrediënten: ${nutritionSettings.avoid_ingredients.join(', ')}`);
      }
      if (nutritionSettings.no_go_items.length > 0) {
        contextParts.push(`ABSOLUUT NIET GEBRUIKEN (no-go): ${nutritionSettings.no_go_items.join(', ')}`);
      }
      if (nutritionSettings.prefer_ingredients.length > 0) {
        contextParts.push(`Gebruik bij voorkeur: ${nutritionSettings.prefer_ingredients.join(', ')}`);
      }
      if (nutritionSettings.perimenopause_focus.length > 0) {
        contextParts.push(`Focus op perimenopauze: ${nutritionSettings.perimenopause_focus.join(', ')}`);
      }
      if (nutritionSettings.target_protein_g) {
        contextParts.push(`Streef naar ${nutritionSettings.target_protein_g}g eiwit per maaltijd`);
      }
      if (nutritionSettings.target_fiber_g) {
        contextParts.push(`Streef naar ${nutritionSettings.target_fiber_g}g vezels per maaltijd`);
      }
      
      if (contextParts.length > 0) {
        contextInstructions = '\n\nGEBRUIKERSVOORKEUREN:\n' + contextParts.join('\n');
      }
    }

    // Build recipe context
    let recipeContext = '';
    if (effectiveMealType) {
      recipeContext += `\nMaaltijdtype: ${effectiveMealType}`;
    }
    if (effectiveWeatherSeason) {
      recipeContext += `\nWeerseizoen: ${effectiveWeatherSeason} (gebruik seizoensgebonden producten)`;
    }
    if (effectiveCyclePhase) {
      const phaseDescriptions: Record<string, string> = {
        menstruatie: 'Menstruatiefase - focus op ijzerrijke voeding, magnesium, rustgevend',
        folliculair: 'Folliculaire fase - energie opbouwen, lichte voeding',
        ovulatie: 'Ovulatiefase - piek energie, antioxidanten',
        luteaal: 'Luteale fase - comfort food, magnesium, B-vitamines',
      };
      recipeContext += `\nCyclusfase: ${phaseDescriptions[effectiveCyclePhase] || effectiveCyclePhase}`;
    }
    if (dietTags && dietTags.length > 0) {
      recipeContext += `\nDieetwensen: ${dietTags.join(', ')}`;
    }

    const userPrompt = `${prompt}${contextInstructions}${recipeContext}

CRITICAL: Respond with ONLY a valid JSON array. No text before or after. Start directly with [ and end with ].
Each recipe MUST include:
- title, description, meal_type (${effectiveMealType || 'ontbijt|lunch|diner|snack'})
- ingredients: array of {amount, item}
- instructions (string)
- prep_time_minutes, cook_time_minutes, servings
- protein_g, fiber_g, kcal, carbs_g, fat_g
- diet_tags: array (e.g. ["vegetarisch", "eiwitrijk"])
- seasons: array with weather seasons ["${effectiveWeatherSeason || 'winter|lente|zomer|herfst'}"]
- cycle_phases: array with cycle phases ["${effectiveCyclePhase || 'menstruatie|folliculair|ovulatie|luteaal'}"]

Example format:
[{"title":"...","description":"...","meal_type":"${effectiveMealType}","ingredients":[{"amount":"100g","item":"spinazie"}],"instructions":"...","prep_time_minutes":5,"cook_time_minutes":10,"servings":2,"protein_g":25,"fiber_g":8,"kcal":350,"carbs_g":20,"fat_g":15,"diet_tags":["vegetarisch","eiwitrijk"],"seasons":["${effectiveWeatherSeason}"],"cycle_phases":["${effectiveCyclePhase || 'luteaal'}"]}]`;

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
      JSON.stringify({ 
        recipes: validRecipes,
        context: {
          mealType: effectiveMealType,
          weatherSeason: effectiveWeatherSeason,
          cyclePhase: effectiveCyclePhase,
        }
      }),
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
