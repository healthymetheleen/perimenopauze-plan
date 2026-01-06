import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, count = 5 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!prompt || typeof prompt !== 'string' || prompt.length < 5) {
      return new Response(
        JSON.stringify({ error: "Prompt moet minimaal 5 karakters zijn" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating ${count} recipes with prompt: ${prompt}`);

    const systemPrompt = `Je bent een orthomoleculair voedingsexpert gespecialiseerd in KPNI (Klinische PsychoNeuroImmunologie) en functional medicine voor vrouwen in de perimenopauze.

VOEDINGSFILOSOFIE (ALTIJD TOEPASSEN):
- Focus op groenten en eiwitten, koolhydraatarm
- Pseudogranen (quinoa, boekweit, amarant) in plaats van reguliere granen
- 25-40 gram eiwit per maaltijd
- 8-12 gram vezels per maaltijd
- Puur, onbewerkt en biologisch
- Vlees/zuivel: grasgevoerd en biologisch
- Zuivel: rauwe zuivel, kefir, gefermenteerde producten
- Inclusief kiemen en gefermenteerde voeding
- Minimaal peulvruchten (beperkt gebruik)
- Vis: alleen zalm en kleiner (makreel, sardines, haring) vanwege gifstoffen
- 100% suikervrij - GEEN suiker en GEEN suikeralternatieven (geen honing, agave, stevia, etc.)
- Geen bewerkte voeding, geen E-nummers

CYCLUSFASEN ("seasons" veld):
- winter = menstruatie (focus op ijzerrijk, rustgevend)
- lente = folliculair (energie opbouwen, lichte maaltijden)
- zomer = ovulatie (piek energie, sociale maaltijden)
- herfst = luteaal (comfort, bloedsuikerstabiel, magnesiumrijk)

SEIZOENSPRODUCTEN NEDERLAND:
- Lente (maart-mei): asperges, rabarber, spinazie, prei, radijs, nieuwe aardappelen
- Zomer (juni-aug): courgette, tomaten, komkommer, paprika, bonen, aardbeien, bessen
- Herfst (sep-nov): pompoen, kool, pastinaak, peren, appels, paddenstoelen
- Winter (dec-feb): boerenkool, spruitjes, witlof, knolselderij, rode kool, wortel

ALLERGENEN & DIËTEN:
- Detecteer automatisch allergenen in ingrediënten
- Markeer recepten voor zwangerschap/kinderwens waar van toepassing
- Voeg relevante diet_tags toe

Genereer ${count} recepten in JSON format met deze exacte structuur:
{
  "title": "string",
  "description": "string (1-2 zinnen, noem functional medicine voordeel)",
  "instructions": "string (stapsgewijze instructies)",
  "prep_time_minutes": number,
  "cook_time_minutes": number,
  "servings": number,
  "meal_type": "ontbijt" | "lunch" | "diner" | "snack" | "tussendoortje" | "drankje",
  "seasons": ["winter" | "lente" | "zomer" | "herfst"],
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

Retourneer ALLEEN een JSON array met de recepten, geen extra tekst.`;

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
          JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Krediet op, voeg tegoed toe aan je workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service niet beschikbaar");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Geen response van AI");
    }

    console.log("Raw AI response:", content);

    // Parse JSON from response (handle markdown code blocks)
    let recipes;
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\s*/g, '');
      }
      recipes = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Kon recepten niet parsen uit AI response");
    }

    if (!Array.isArray(recipes)) {
      recipes = [recipes];
    }

    // Validate structure
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
