import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SupportedLanguage = 'nl' | 'en';

function getLanguage(lang?: string): SupportedLanguage {
  if (lang === 'en') return 'en';
  return 'nl';
}

const systemPrompts = {
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

WEER/KALENDER SEIZOENEN ("seasons" veld):
- lente = maart-mei
- zomer = juni-augustus  
- herfst = september-november
- winter = december-februari

CYCLUSFASEN ("cycle_phases" veld - APART van seasons):
- menstruatie = rustfase, ijzerrijk, verwarmend, comfort
- folliculair = energie opbouwen, lichte maaltijden, verse groenten
- ovulatie = piek energie, sociale maaltijden, lichte eiwitten
- luteaal = comfort, bloedsuikerstabiel, magnesiumrijk, anti-craving

SEIZOENSPRODUCTEN NEDERLAND:
- Lente (maart-mei): asperges, rabarber, spinazie, prei, radijs, nieuwe aardappelen
- Zomer (juni-aug): courgette, tomaten, komkommer, paprika, bonen, aardbeien, bessen
- Herfst (sep-nov): pompoen, kool, pastinaak, peren, appels, paddenstoelen
- Winter (dec-feb): boerenkool, spruitjes, witlof, knolselderij, rode kool, wortel

ALLERGENEN & DIËTEN (BELANGRIJK - LOGICA):
- Als "veganistisch" dan OOK "vegetarisch" toevoegen
- Als "lactosevrij" dan OOK "zuivelvrij" toevoegen
- Detecteer automatisch allergenen in ingrediënten
- Markeer recepten voor zwangerschap/kinderwens waar van toepassing

Genereer ${count} recepten in JSON format met deze exacte structuur:
{
  "title": "string",
  "description": "string (1-2 zinnen, noem functional medicine voordeel)",
  "instructions": "string (GESTRUCTUREERD stappenplan met Markdown formatting:
    - Gebruik ## kopjes voor onderdelen (bijv. ## Deeg, ## Saus, ## Afwerking, ## Bereiding)
    - Gebruik genummerde stappen onder elk kopje (1. Doe dit... 2. Dan dit...)
    - Gebruik ALLEEN onderdeel-kopjes als het recept meerdere componenten heeft
    - Voor simpele recepten: direct genummerde stappen zonder kopjes
    - Voeg timing toe waar relevant (bijv. 'Bak 5 minuten' of 'Laat 10 min rusten')
    - Voorbeeld met onderdelen:
      ## Deeg
      1. Meng de bloem met het zout
      2. Voeg het water toe en kneed 5 minuten
      
      ## Vulling
      1. Fruit de ui glazig
      2. Voeg de groenten toe
      
      ## Afwerking
      1. Vul het deeg met de vulling
      2. Bak af in de oven op 180°C, 25 minuten
    - Voorbeeld simpel recept:
      1. Snijd de groenten in blokjes
      2. Verhit de olie in een pan
      3. Bak de groenten 5-7 minuten
      4. Breng op smaak met kruiden
  )",
  "prep_time_minutes": number,
  "cook_time_minutes": number,
  "servings": number,
  "meal_type": "ontbijt" | "lunch" | "diner" | "snack" | "tussendoortje" | "drankje" | "smoothie",
  "seasons": ["lente" | "zomer" | "herfst" | "winter"],
  "cycle_phases": ["menstruatie" | "folliculair" | "ovulatie" | "luteaal"],
  "diet_tags": [
    "vegetarisch" | "veganistisch" | "pescotarisch" |
    "glutenvrij" | "zuivelvrij" | "lactosevrij" | "eivrij" | "notenvrij" | "pindavrij" | "sojavrij" |
    "keto" | "low-carb" | "eiwitrijk" | "vezelrijk" | "anti-inflammatoir" | "bloedsuikerstabiel" |
    "zwangerschapsveilig" | "kinderwensvriendelijk" | "foliumzuurrijk" | "ijzerrijk" |
    "simpel" | "snel" | "meal-prep" | "one-pot" | "rauw" | "gefermenteerd"
  ],
  "ingredients": [
    { "name": "string (specificeer biologisch/grasgevoerd waar relevant)", "amount": "string", "unit": "string" }
  ],
  "kcal": number,
  "protein_g": number (streef naar 25-40g),
  "carbs_g": number (houd laag),
  "fat_g": number,
  "fiber_g": number (streef naar 8-12g)
}

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

WEATHER/CALENDAR SEASONS ("seasons" field):
- spring = March-May
- summer = June-August
- autumn = September-November
- winter = December-February

CYCLE PHASES ("cycle_phases" field - SEPARATE from seasons):
- menstruation = rest phase, iron-rich, warming, comfort
- follicular = building energy, light meals, fresh vegetables
- ovulation = peak energy, social meals, light proteins
- luteal = comfort, blood sugar stable, magnesium-rich, anti-craving

SEASONAL PRODUCE:
- Spring (Mar-May): asparagus, rhubarb, spinach, leeks, radishes, new potatoes
- Summer (Jun-Aug): zucchini, tomatoes, cucumber, bell peppers, beans, strawberries, berries
- Autumn (Sep-Nov): pumpkin, cabbage, parsnips, pears, apples, mushrooms
- Winter (Dec-Feb): kale, Brussels sprouts, endive, celeriac, red cabbage, carrots

ALLERGENS & DIETS (IMPORTANT - LOGIC):
- If "vegan" then ALSO add "vegetarian"
- If "lactose-free" then ALSO add "dairy-free"
- Automatically detect allergens in ingredients
- Mark recipes for pregnancy/fertility where applicable

Generate ${count} recipes in JSON format with this exact structure:
{
  "title": "string",
  "description": "string (1-2 sentences, mention functional medicine benefit)",
  "instructions": "string (STRUCTURED step-by-step with Markdown formatting:
    - Use ## headings for sections (e.g. ## Dough, ## Sauce, ## Finishing, ## Preparation)
    - Use numbered steps under each heading (1. Do this... 2. Then this...)
    - Only use section headings if the recipe has multiple components
    - For simple recipes: direct numbered steps without headings
    - Add timing where relevant (e.g. 'Cook 5 minutes' or 'Let rest 10 min')
    - Example with sections:
      ## Dough
      1. Mix the flour with the salt
      2. Add the water and knead for 5 minutes
      
      ## Filling
      1. Sauté the onion until translucent
      2. Add the vegetables
      
      ## Finishing
      1. Fill the dough with the filling
      2. Bake in the oven at 350°F, 25 minutes
    - Example simple recipe:
      1. Cut the vegetables into cubes
      2. Heat the oil in a pan
      3. Cook the vegetables 5-7 minutes
      4. Season with herbs
  )",
  "prep_time_minutes": number,
  "cook_time_minutes": number,
  "servings": number,
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack" | "treat" | "beverage" | "smoothie",
  "seasons": ["spring" | "summer" | "autumn" | "winter"],
  "cycle_phases": ["menstruation" | "follicular" | "ovulation" | "luteal"],
  "diet_tags": [
    "vegetarian" | "vegan" | "pescatarian" |
    "gluten-free" | "dairy-free" | "lactose-free" | "egg-free" | "nut-free" | "peanut-free" | "soy-free" |
    "keto" | "low-carb" | "protein-rich" | "fiber-rich" | "anti-inflammatory" | "blood-sugar-stable" |
    "pregnancy-safe" | "fertility-friendly" | "folate-rich" | "iron-rich" |
    "simple" | "quick" | "meal-prep" | "one-pot" | "raw" | "fermented"
  ],
  "ingredients": [
    { "name": "string (specify organic/grass-fed where relevant)", "amount": "string", "unit": "string" }
  ],
  "kcal": number,
  "protein_g": number (aim for 25-40g),
  "carbs_g": number (keep low),
  "fat_g": number,
  "fiber_g": number (aim for 8-12g)
}

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

    const systemPrompt = systemPrompts[lang](count);

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
          { role: "user", content: prompt }
        ],
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
