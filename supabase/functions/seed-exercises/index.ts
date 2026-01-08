import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Exercise data with descriptions in Dutch
const exercises = [
  // MENSTRUAL PHASE (Winter) - Gentle, restorative
  {
    name: "Child's Pose",
    name_dutch: "Kindhouding",
    description: "Een rustgevende houding die spanning in de onderrug verlicht en het zenuwstelsel kalmeert. Perfect tijdens de menstruatie wanneer je lichaam rust nodig heeft.\n\n**Uitvoering:**\n1. Kniel op de grond met je grote tenen tegen elkaar\n2. Spreid je knieën iets breder dan je heupen\n3. Buig voorover en laat je voorhoofd op de mat rusten\n4. Strek je armen naar voren of leg ze langs je lichaam\n5. Adem diep in je buik en houd 1-3 minuten vast",
    duration: "3-5 min",
    benefits: ["Verlicht menstruatiepijn", "Kalmeert het zenuwstelsel", "Ontspant de onderrug", "Vermindert stress"],
    difficulty: "beginner",
    cycle_phase: "menstrual",
    sort_order: 1,
    is_active: true,
  },
  {
    name: "Legs Up The Wall",
    name_dutch: "Benen tegen de muur",
    description: "Een herstellende inversie die de bloedsomloop verbetert en vermoeide benen verlicht. Ideaal voor bloating en zware benen tijdens de menstruatie.\n\n**Uitvoering:**\n1. Ga met je zij tegen een muur zitten\n2. Draai je lichaam en zwaai je benen omhoog tegen de muur\n3. Laat je billen zo dicht mogelijk bij de muur rusten\n4. Leg je armen ontspannen naast je lichaam\n5. Sluit je ogen en blijf 5-10 minuten liggen",
    duration: "5-10 min",
    benefits: ["Verbetert bloedcirculatie", "Verlicht zware benen", "Vermindert bloating", "Kalmeert het zenuwstelsel"],
    difficulty: "beginner",
    cycle_phase: "menstrual",
    sort_order: 2,
    is_active: true,
  },
  {
    name: "Reclining Butterfly",
    name_dutch: "Liggende vlinder",
    description: "Een zachte heupopener die spanning in het bekken verlicht. Helpt bij menstruatiekrampen door de bloedstroom naar het bekkengebied te verbeteren.\n\n**Uitvoering:**\n1. Ga op je rug liggen\n2. Breng de voetzolen tegen elkaar en laat je knieën naar buiten vallen\n3. Leg een kussen onder elke knie voor ondersteuning\n4. Plaats je handen op je buik of naast je lichaam\n5. Adem rustig en houd 3-5 minuten vast",
    duration: "3-5 min",
    benefits: ["Opent de heupen zacht", "Verlicht bekkenspanning", "Stimuleert bloedstroom", "Vermindert krampen"],
    difficulty: "beginner",
    cycle_phase: "menstrual",
    sort_order: 3,
    is_active: true,
  },
  
  // FOLLICULAR PHASE (Spring) - Energizing, building
  {
    name: "Cat-Cow Stretch",
    name_dutch: "Kat-Koe stretch",
    description: "Een dynamische wervelkolomoefening die de ruggengraat mobiliseert en energie opwekt. Perfect om de dag te starten in de folliculaire fase.\n\n**Uitvoering:**\n1. Begin op handen en knieën (tafelblad positie)\n2. Inademing: laat je buik zakken, kijk omhoog (koe)\n3. Uitademing: rond je rug, breng je kin naar je borst (kat)\n4. Beweeg vloeiend tussen beide posities\n5. Herhaal 10-15 keer op het ritme van je ademhaling",
    duration: "3-5 min",
    benefits: ["Mobiliseert de wervelkolom", "Wekt energie op", "Verbetert flexibiliteit", "Verwarmt het lichaam"],
    difficulty: "beginner",
    cycle_phase: "follicular",
    sort_order: 1,
    is_active: true,
  },
  {
    name: "Warrior II",
    name_dutch: "Krijger II",
    description: "Een krachtige staande houding die beenkracht opbouwt en focus creëert. De stijgende energie in de folliculaire fase maakt dit het ideale moment voor krachtopbouw.\n\n**Uitvoering:**\n1. Sta met je voeten wijd uit elkaar (ca. 1 meter)\n2. Draai je rechtvoet 90 graden naar buiten\n3. Buig je rechterknie tot boven je enkel\n4. Strek je armen horizontaal, kijk over je rechterhand\n5. Houd 5-8 ademhalingen, wissel van kant",
    duration: "5-8 min",
    benefits: ["Bouwt beenkracht", "Verbetert focus", "Versterkt core", "Verhoogt uithoudingsvermogen"],
    difficulty: "beginner",
    cycle_phase: "follicular",
    sort_order: 2,
    is_active: true,
  },
  {
    name: "Sun Salutation",
    name_dutch: "Zonnegroet",
    description: "Een energieke flow die het hele lichaam activeert. De stijgende energie en het hogere oestrogeen maken dit het perfecte moment voor dynamische oefeningen.\n\n**Uitvoering:**\n1. Sta rechtop, handen in gebedshouding\n2. Adem in, strek armen omhoog\n3. Adem uit, buig voorover\n4. Adem in, half omhoog, vlakke rug\n5. Stap of spring naar plank, naar cobra, naar neerwaartse hond\n6. Stap naar voren en kom omhoog\n7. Herhaal 5-10 rondes",
    duration: "10-15 min",
    benefits: ["Activeert het hele lichaam", "Verhoogt energie", "Verbetert flexibiliteit", "Versterkt spieren"],
    difficulty: "intermediate",
    cycle_phase: "follicular",
    sort_order: 3,
    is_active: true,
  },
  
  // OVULATORY PHASE (Summer) - Peak energy, challenging
  {
    name: "Dancer Pose",
    name_dutch: "Dansershouding",
    description: "Een elegante balanshouding die kracht en flexibiliteit combineert. Tijdens de ovulatie is je energie en coördinatie op het hoogtepunt.\n\n**Uitvoering:**\n1. Sta op je linkerbeen, focus op een punt voor je\n2. Pak je rechterenkel met je rechterhand\n3. Strek je linkerarm naar voren\n4. Leun voorover terwijl je je rechterbeen optilt\n5. Houd 5-8 ademhalingen, wissel van kant",
    duration: "5-8 min",
    benefits: ["Verbetert balans", "Opent de borst", "Versterkt benen", "Verhoogt concentratie"],
    difficulty: "intermediate",
    cycle_phase: "ovulatory",
    sort_order: 1,
    is_active: true,
  },
  {
    name: "Crow Pose",
    name_dutch: "Kraaihouding",
    description: "Een uitdagende armbalans die kernkracht en focus vereist. De piekenergie tijdens de ovulatie maakt dit het ideale moment om jezelf uit te dagen.\n\n**Uitvoering:**\n1. Begin in een diepe hurkzit\n2. Plaats je handen schouderbreedte op de mat\n3. Breng je knieën tegen de achterkant van je bovenarmen\n4. Leun voorover en til langzaam je voeten van de grond\n5. Houd 3-5 ademhalingen, werk op naar langer",
    duration: "5-10 min",
    benefits: ["Bouwt armkracht", "Versterkt core", "Verbetert concentratie", "Verhoogt zelfvertrouwen"],
    difficulty: "advanced",
    cycle_phase: "ovulatory",
    sort_order: 2,
    is_active: true,
  },
  {
    name: "Half Moon Pose",
    name_dutch: "Halve maanhouding",
    description: "Een krachtige balanshouding die de zijkant van het lichaam opent. Perfect voor de ovulatoire fase wanneer je coördinatie optimaal is.\n\n**Uitvoering:**\n1. Begin in Krijger II met je rechterbeen gebogen\n2. Plaats je rechterhand ca. 30 cm voor je rechtervoet\n3. Til je linkerbeen omhoog tot heuphoogte\n4. Strek je linkerarm naar het plafond\n5. Houd 5-8 ademhalingen, wissel van kant",
    duration: "5-8 min",
    benefits: ["Versterkt benen en core", "Opent de heupen", "Verbetert balans", "Vergroot lichaamsbewustzijn"],
    difficulty: "intermediate",
    cycle_phase: "ovulatory",
    sort_order: 3,
    is_active: true,
  },
  
  // LUTEAL PHASE (Autumn) - Calming, grounding
  {
    name: "Seated Forward Fold",
    name_dutch: "Zittende vooroverbuiging",
    description: "Een kalmerende vooroverbuiging die het zenuwstelsel tot rust brengt. Ideaal voor de luteale fase wanneer rust en herstel belangrijk worden.\n\n**Uitvoering:**\n1. Zit met gestrekte benen voor je\n2. Adem in en strek je wervelkolom\n3. Adem uit en buig vanuit je heupen naar voren\n4. Laat je handen rusten waar ze komen\n5. Ontspan je hoofd en houd 1-3 minuten vast",
    duration: "3-5 min",
    benefits: ["Kalmeert het zenuwstelsel", "Strekt de hamstrings", "Vermindert stress", "Verbetert de spijsvertering"],
    difficulty: "beginner",
    cycle_phase: "luteal",
    sort_order: 1,
    is_active: true,
  },
  {
    name: "Pigeon Pose",
    name_dutch: "Duifhouding",
    description: "Een diepe heupopener die emotionele spanning helpt loslaten. De luteale fase is een goed moment om opgeslagen spanning in de heupen te bevrijden.\n\n**Uitvoering:**\n1. Begin in een hoge plank of neerwaartse hond\n2. Breng je rechterknie naar je rechterhand\n3. Laat je linkerbeen gestrekt achter je\n4. Zak je heupen naar de grond\n5. Buig voorover en houd 1-3 minuten, wissel van kant",
    duration: "5-8 min",
    benefits: ["Opent diepe heupspieren", "Bevrijdt emotionele spanning", "Strekt de heupflexoren", "Kalmeert de geest"],
    difficulty: "intermediate",
    cycle_phase: "luteal",
    sort_order: 2,
    is_active: true,
  },
  {
    name: "Supine Spinal Twist",
    name_dutch: "Liggende werveldraaing",
    description: "Een ontspannende draaiing die spanning in de rug verlicht en de spijsvertering ondersteunt. Perfect voor de luteale fase wanneer bloating kan optreden.\n\n**Uitvoering:**\n1. Ga op je rug liggen, armen gespreid\n2. Trek je rechterknie naar je borst\n3. Laat je rechterknie naar links vallen over je lichaam\n4. Kijk naar rechts, houd je schouders op de grond\n5. Houd 1-3 minuten, wissel van kant",
    duration: "5-8 min",
    benefits: ["Ontspant de rugspieren", "Ondersteunt spijsvertering", "Vermindert bloating", "Kalmeert het zenuwstelsel"],
    difficulty: "beginner",
    cycle_phase: "luteal",
    sort_order: 3,
    is_active: true,
  },
];

// Map exercise names to image filenames
const imageMap: Record<string, string> = {
  "Child's Pose": "menstrual-childs-pose.webp",
  "Legs Up The Wall": "menstrual-legs-up-wall.webp",
  "Reclining Butterfly": "menstrual-reclining-butterfly.webp",
  "Cat-Cow Stretch": "follicular-cat-cow.webp",
  "Warrior II": "follicular-warrior2.webp",
  "Sun Salutation": "follicular-sun-salutation.webp",
  "Dancer Pose": "ovulatory-dancer.webp",
  "Crow Pose": "ovulatory-crow.webp",
  "Half Moon Pose": "ovulatory-half-moon.webp",
  "Seated Forward Fold": "luteal-forward-fold.webp",
  "Pigeon Pose": "luteal-pigeon.webp",
  "Supine Spinal Twist": "luteal-spinal-twist.webp",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the base URL for images from request body or use default
    const { imageBaseUrl } = await req.json().catch(() => ({}));

    const results = [];
    
    for (const exercise of exercises) {
      const imageFilename = imageMap[exercise.name];
      // For now, we'll set image_url to null - admin can upload images later
      // Or we can use the generated images from the assets folder
      
      const { data, error } = await supabase
        .from("exercises")
        .insert({
          ...exercise,
          image_url: imageBaseUrl ? `${imageBaseUrl}/${imageFilename}` : null,
        })
        .select()
        .single();

      if (error) {
        console.error(`Error inserting ${exercise.name}:`, error);
        results.push({ name: exercise.name, success: false, error: error.message });
      } else {
        results.push({ name: exercise.name, success: true, id: data?.id });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Exercises seeded successfully", 
        results,
        total: exercises.length,
        successful: results.filter(r => r.success).length
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error seeding exercises:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to seed exercises", details: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
