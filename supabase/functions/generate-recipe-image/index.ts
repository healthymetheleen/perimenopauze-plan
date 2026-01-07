import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Compress and resize image
async function compressImage(base64Data: string, maxWidth: number, maxHeight: number, targetSizeKB: number): Promise<Uint8Array> {
  // Remove data URL prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const imageBytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
  
  try {
    // Decode the image
    const image = await Image.decode(imageBytes);
    
    // Calculate new dimensions to fit within max bounds
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
    while (compressed.length > targetBytes && quality > 30) {
      quality -= 10;
      compressed = await image.encodeJPEG(quality);
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
        
        // Generate unique filename base
        const fileId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        // 1. Compress and upload full-size image (max 1200x675 wide landscape, target 100kb)
        const fullImage = await compressImage(imageData, 1200, 675, 100);
        const fullFileName = `recipe-${fileId}.webp`;
        const fullFilePath = `recipe-images/${fullFileName}`;
        
        const { error: fullUploadError } = await supabase.storage
          .from('public')
          .upload(fullFilePath, fullImage, {
            contentType: 'image/webp',
            upsert: false
          });
        
        if (fullUploadError) {
          console.error("Full image upload error:", fullUploadError);
          return new Response(
            JSON.stringify({ imageUrl: imageData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // 2. Create and upload thumbnail (150x150, target 15kb)
        const thumbnail = await compressImage(imageData, 150, 150, 15);
        const thumbFileName = `recipe-${fileId}-thumb.webp`;
        const thumbFilePath = `recipe-images/${thumbFileName}`;
        
        const { error: thumbUploadError } = await supabase.storage
          .from('public')
          .upload(thumbFilePath, thumbnail, {
            contentType: 'image/webp',
            upsert: false
          });
        
        if (thumbUploadError) {
          console.error("Thumbnail upload error:", thumbUploadError);
          // Continue with just the full image
        }
        
        // Get public URLs
        const { data: fullUrlData } = supabase.storage
          .from('public')
          .getPublicUrl(fullFilePath);
        
        const { data: thumbUrlData } = supabase.storage
          .from('public')
          .getPublicUrl(thumbFilePath);
        
        console.log("Images uploaded successfully:", fullUrlData.publicUrl, thumbUrlData.publicUrl);
        
        return new Response(
          JSON.stringify({ 
            imageUrl: fullUrlData.publicUrl,
            thumbnailUrl: thumbUploadError ? null : thumbUrlData.publicUrl
          }),
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
