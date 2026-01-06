import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Compress and resize image to wide landscape format (16:9 ratio, max 100kb)
async function compressImage(base64Data: string, maxWidth = 1200, maxHeight = 675, targetSizeKB = 100): Promise<Uint8Array> {
  // Remove data URL prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const imageBytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
  
  try {
    // Decode the image
    const image = await Image.decode(imageBytes);
    
    // Calculate new dimensions to fit within maxWidth x maxHeight (16:9 landscape)
    const aspectRatio = image.width / image.height;
    let newWidth = image.width;
    let newHeight = image.height;
    
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = Math.round(maxWidth / aspectRatio);
    }
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = Math.round(maxHeight * aspectRatio);
    }
    
    // Resize the image
    image.resize(newWidth, newHeight);
    
    // Start with quality 70, reduce if needed to hit target size
    let quality = 70;
    let compressed = await image.encodeJPEG(quality);
    
    // If still too large, reduce quality iteratively
    const targetBytes = targetSizeKB * 1024;
    while (compressed.length > targetBytes && quality > 40) {
      quality -= 10;
      compressed = await image.encodeJPEG(quality);
      console.log(`Reducing quality to ${quality}, size: ${compressed.length} bytes`);
    }
    
    console.log(`Image compressed: ${newWidth}x${newHeight}, quality ${quality}, ${imageBytes.length} -> ${compressed.length} bytes (${Math.round(compressed.length/1024)}kb)`);
    return compressed;
  } catch (error) {
    console.error("Image compression failed, using original:", error);
    return imageBytes;
  }
}

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

    // Detailed prompt for clean food photography
    const imagePrompt = `Professional overhead food photography of ${recipeTitle}. ${mealType || 'dish'}.

REQUIREMENTS:
- Bird's eye view, looking straight down
- Wooden table background (oak, walnut, pine, or other natural wood - NO metal, NO plastic, NO glass surfaces)
- Natural soft daylight
- Beautiful ceramic or porcelain plate
- Clean composition: NO loose food items scattered on the table (no loose herbs, leaves, twigs, seeds, grains, crumbs outside the plate)
- Background shows ONLY the wooden table surface - NO windows, NO doors, NO walls, NO room visible
- Optional: a folded linen napkin beside the plate
- Scandinavian minimal aesthetic, soft natural colors
- No text, no watermarks, no logos, no writing of any kind

The entire frame should be filled with just the wooden table and the plated dish.`;

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
        
        // Compress and resize the image (max 1200x675 wide landscape, target 100kb)
        const compressedImage = await compressImage(imageData, 1200, 675, 100);
        
        // Generate unique filename
        const fileName = `recipe-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
        const filePath = `recipe-images/${fileName}`;
        
        // Upload to storage as WebP
        const { error: uploadError } = await supabase.storage
          .from('public')
          .upload(filePath, compressedImage, {
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
