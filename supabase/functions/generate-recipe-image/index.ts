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

    // Simplified prompt focusing on food photography
    const imagePrompt = `Professional overhead food photography of ${recipeTitle}. ${mealType || 'dish'}. Light wooden table, natural daylight, ceramic plate, Scandinavian minimal style. No text, no watermarks.`;

    console.log("Using prompt:", imagePrompt);

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
    console.log("Full API response:", JSON.stringify(data, null, 2));
    
    // Try multiple paths to find the image
    let imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Alternative: check if image is in content as base64
    if (!imageData) {
      const content = data.choices?.[0]?.message?.content;
      if (content && typeof content === 'string' && content.startsWith('data:image')) {
        imageData = content;
      }
    }
    
    // Alternative: check inline_data format
    if (!imageData && data.choices?.[0]?.message?.parts) {
      const imagePart = data.choices[0].message.parts.find((p: any) => p.inline_data);
      if (imagePart?.inline_data?.data) {
        imageData = `data:${imagePart.inline_data.mime_type || 'image/png'};base64,${imagePart.inline_data.data}`;
      }
    }
    
    if (!imageData) {
      console.error("No image found in response. Response structure:", Object.keys(data));
      console.error("Message structure:", data.choices?.[0]?.message ? Object.keys(data.choices[0].message) : 'no message');
      return new Response(
        JSON.stringify({ error: "Afbeelding genereren mislukt, probeer opnieuw" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload to Supabase storage if configured
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Convert base64 to buffer - handle data URL format
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
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
