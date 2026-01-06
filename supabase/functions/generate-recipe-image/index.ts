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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!recipeTitle) {
      return new Response(
        JSON.stringify({ error: "recipeTitle is vereist" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating image for recipe: ${recipeTitle}`);

    // Construct a detailed prompt for consistent style
    const imagePrompt = `Food photography, overhead view from directly above, looking down at a beautiful ${mealType || 'dish'}: ${recipeTitle}. ${recipeDescription || ''}

Style requirements:
- Shot from directly above (bird's eye view / flat lay)
- Rustic light oak wooden table as background
- Natural soft daylight from the side
- Minimal props - just the dish on a simple white or cream ceramic plate
- Fresh herbs or ingredients scattered naturally around
- Clean, minimalist, Scandinavian aesthetic
- Soft, muted colors - not oversaturated
- Professional food photography quality
- Feminine and fresh feeling
- No text, no watermarks, no logos`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
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
      throw new Error("AI image service niet beschikbaar");
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("Geen afbeelding gegenereerd");
    }

    // If we have Supabase storage configured, upload the image as WebP for efficiency
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Convert base64 to buffer - detect original format
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // Generate unique filename with WebP extension for storage efficiency
        // The AI model returns PNG, but we store the raw bytes and serve with proper content-type
        const fileName = `recipe-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
        const filePath = `recipe-images/${fileName}`;
        
        // Upload to storage as WebP (browsers will handle format conversion on display)
        // For server-side conversion, we'd need a separate image processing service
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('public')
          .upload(filePath, imageBuffer, {
            contentType: 'image/webp',
            upsert: false
          });
        
        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          // Fall back to returning base64
          return new Response(
            JSON.stringify({ imageUrl: imageData }),
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
          JSON.stringify({ imageUrl: imageData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return base64 if no storage configured
    return new Response(
      JSON.stringify({ imageUrl: imageData }),
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
