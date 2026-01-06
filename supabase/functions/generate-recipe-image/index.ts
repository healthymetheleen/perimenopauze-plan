import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipeTitle, recipeDescription, mealType } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("ChatGPT");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("ChatGPT API key is not configured");
    }

    if (!recipeTitle) {
      return new Response(
        JSON.stringify({ error: "recipeTitle is vereist" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating image for recipe: ${recipeTitle}`);

    // Detailed prompt for consistent, feminine, fresh style
    // No loose items on table, varied beautiful plates, soft colors
    const imagePrompt = `Professional food photography, overhead bird's eye view looking straight down at a beautiful ${mealType || 'dish'}: ${recipeTitle}. ${recipeDescription || ''}

CRITICAL STYLE REQUIREMENTS:
- Shot from directly above (flat lay composition)
- Light oak wooden dining table as clean background
- Soft natural daylight from the side, bright and airy
- The dish served on a beautiful ceramic plate - vary between: pastel colored plates, Portuguese azulejo-style plates, cream white plates, soft terracotta plates
- Clean minimalist composition - NO loose items scattered on the table (no pepper flakes, no scattered herbs, no crumbs, no loose ingredients)
- ALLOWED decorations: a folded linen napkin, a small spoon or fork on a napkin, a coaster under a glass, a simple placemat under the plate
- Optionally include: a nice glass of water or complementary drink placed to the side
- Fresh, light, feminine, Scandinavian aesthetic
- Soft muted pastel colors - not oversaturated, not dark
- Ultra clean and polished look
- No text, no watermarks, no logos
- Square format 1:1 aspect ratio`;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        output_format: "webp",
        output_compression: 80,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Krediet op, voeg tegoed toe." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error("OpenAI image service niet beschikbaar");
    }

    const data = await response.json();
    const base64Image = data.data?.[0]?.b64_json;
    
    if (!base64Image) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("Geen afbeelding gegenereerd");
    }

    // Upload to Supabase storage if configured
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Convert base64 to buffer
        const imageBuffer = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));
        
        // Generate unique filename
        const fileName = `recipe-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
        const filePath = `recipe-images/${fileName}`;
        
        // Upload to storage as WebP
        const { error: uploadError } = await supabase.storage
          .from('public')
          .upload(filePath, imageBuffer, {
            contentType: 'image/webp',
            upsert: false
          });
        
        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          // Fall back to returning base64
          return new Response(
            JSON.stringify({ imageUrl: `data:image/webp;base64,${base64Image}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('public')
          .getPublicUrl(filePath);
        
        console.log("Image uploaded successfully:", urlData.publicUrl);
        
        return new Response(
          JSON.stringify({ imageUrl: urlData.publicUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (storageError) {
        console.error("Storage error:", storageError);
        // Fall back to returning base64
        return new Response(
          JSON.stringify({ imageUrl: `data:image/webp;base64,${base64Image}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return base64 if no storage configured
    return new Response(
      JSON.stringify({ imageUrl: `data:image/webp;base64,${base64Image}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-recipe-image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
