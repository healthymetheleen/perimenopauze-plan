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

    const systemPrompt = `Je bent een expert op het gebied van voeding voor vrouwen in de perimenopauze, met focus op Nederlandse seizoensproducten.

BELANGRIJKE CONTEXT:
1. Cyclusfasen ("seasons" veld): winter = menstruatie, lente = follikel, zomer = ovulatie, herfst = luteaal
2. Kalenderseizoenen ("calendar_seasons" veld): gebruik producten die in Nederland in dat seizoen vers verkrijgbaar zijn

SEIZOENSPRODUCTEN NEDERLAND:
- Lente (maart-mei): asperges, rabarber, spinazie, prei, radijs, nieuwe aardappelen
- Zomer (juni-aug): courgette, tomaten, komkommer, paprika, bonen, aardbeien, bessen, perzik
- Herfst (sep-nov): pompoen, kool, pastinaak, peren, appels, pruimen, paddenstoelen
- Winter (dec-feb): boerenkool, spruitjes, witlof, knolselderij, rode kool, wortel, citrusvruchten

Genereer recepten die:
- Eiwitrijk zijn (minimaal 20g eiwit per portie waar mogelijk)
- Anti-inflammatoir en bloedsuikerstabiel zijn
- Rijk aan vezels, omega-3, en micronutriënten
- Gebruik maken van verse Nederlandse seizoensproducten

Genereer ${count} recepten in JSON format. Elk recept moet deze exacte structuur hebben:
{
  "title": "string",
  "description": "string (korte beschrijving, 1-2 zinnen, noem seizoensproduct)",
  "instructions": "string (stapsgewijze instructies)",
  "prep_time_minutes": number,
  "cook_time_minutes": number,
  "servings": number,
  "meal_type": "ontbijt" | "lunch" | "diner" | "snack" | "tussendoortje",
  "seasons": ["winter" | "lente" | "zomer" | "herfst"] (cyclusfasen waarvoor geschikt, meerdere mogelijk),
  "calendar_seasons": ["lente" | "zomer" | "herfst" | "winter"] (kalenderseizoenen voor NL producten),
  "diet_tags": ["vegetarisch" | "veganistisch" | "glutenvrij" | "zuivelvrij" | "lactosevrij" | "keto" | "low-carb" | "eiwitrijk" | "vezelrijk" | "anti-inflammatoir" | "bloedsuikerstabiel"],
  "ingredients": [
    { "name": "string", "amount": "string (bijv. '200')", "unit": "string (bijv. 'gram')", "is_seasonal": boolean }
  ],
  "kcal": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number
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
