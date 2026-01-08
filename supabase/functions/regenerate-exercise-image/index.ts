import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Phase-specific color palettes matching the existing illustration style
const phaseColors: Record<string, { background: string; accent: string; description: string }> = {
  menstrual: {
    background: "#E8E4DF",
    accent: "#8B9A7D",
    description: "muted sage green accents on warm grey background"
  },
  follicular: {
    background: "#F5E6E0",
    accent: "#E8A090",
    description: "soft coral pink and warm peach tones on blush background"
  },
  ovulatory: {
    background: "#F5EBD7",
    accent: "#D4A855",
    description: "warm golden yellow and amber accents on cream background"
  },
  luteal: {
    background: "#EDE4DA",
    accent: "#C4795A",
    description: "terracotta orange and warm brown tones on beige background"
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exerciseId, exerciseName, cyclePhase } = await req.json();

    if (!exerciseId || !exerciseName || !cyclePhase) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: exerciseId, exerciseName, cyclePhase" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user is admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roles?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can regenerate images" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const colors = phaseColors[cyclePhase] || phaseColors.menstrual;
    
    // Build the prompt for consistent yoga pose illustration matching existing style
    // The existing images have: soft watercolor aesthetic, single woman silhouette, muted earthy tones, 
    // simple clean lines, no facial details, gentle flowing poses, minimalist backgrounds
    const prompt = `Soft watercolor illustration of a woman in ${exerciseName} yoga pose. 
Style: Gentle feminine wellness illustration, similar to modern yoga app artwork.
Woman: Single female figure, graceful flowing silhouette, no facial details, anatomically correct with exactly TWO arms and TWO legs.
Colors: ${colors.description}, soft muted palette.
Background: Simple solid ${colors.background} color, no patterns or details.
Aesthetic: Calming, serene, minimalist, organic curves, soft edges like watercolor wash.
Must NOT include: text, multiple figures, detailed faces, harsh lines, busy backgrounds.
Square 1:1 aspect ratio, high quality, professional wellness illustration.`;

    console.log("Generating image with prompt:", prompt);

    // Call Lovable AI to generate image
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const imageDataUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageDataUrl) {
      console.error("No image in AI response:", aiData);
      return new Response(
        JSON.stringify({ error: "No image generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert base64 to blob and upload to Supabase Storage
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `exercises/${exerciseId}-${Date.now()}.webp`;
    
    // Use service role for storage upload
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: uploadError } = await supabaseAdmin.storage
      .from("content-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("content-images")
      .getPublicUrl(fileName);

    // Update exercise with new image URL
    const { error: updateError } = await supabaseAdmin
      .from("exercises")
      .update({ image_url: publicUrl })
      .eq("id", exerciseId);

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update exercise" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully generated and saved image:", publicUrl);

    return new Response(
      JSON.stringify({ success: true, image_url: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
