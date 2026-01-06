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
