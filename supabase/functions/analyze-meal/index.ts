import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `Je bent een voedingsexpert die maaltijden analyseert. Analyseer de beschrijving of foto van een maaltijd en geef een schatting van de voedingswaarden.

Antwoord ALLEEN met een JSON object in dit formaat (geen andere tekst):
{
  "description": "korte beschrijving van de maaltijd",
  "kcal": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "confidence": "high" | "medium" | "low",
  "notes": "optionele opmerkingen over de schatting"
}

Richtlijnen:
- Wees realistisch met portiegroottes
- Bij twijfel, kies een gemiddelde portie
- Geef confidence "low" als de beschrijving vaag is
- Alle getallen zijn integers of floats, geen strings`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, imageBase64 } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build message content
    const userContent: any[] = [];
    
    if (description) {
      userContent.push({
        type: 'text',
        text: `Analyseer deze maaltijd: ${description}`
      });
    }
    
    if (imageBase64) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
        }
      });
      if (!description) {
        userContent.push({
          type: 'text',
          text: 'Analyseer deze maaltijd op de foto.'
        });
      }
    }

    if (userContent.length === 0) {
      throw new Error('Geen beschrijving of foto ontvangen');
    }

    console.log('Sending request to Lovable AI...');
    
    // Use gpt-5-nano for speed and cost efficiency (maps to gemini-2.5-flash-lite)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Te veel verzoeken. Probeer het later opnieuw.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits zijn op. Neem contact op met support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    // Parse JSON from response
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return a fallback response
      analysis = {
        description: description || 'Onbekende maaltijd',
        kcal: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        fiber_g: null,
        confidence: 'low',
        notes: 'Kon de maaltijd niet analyseren. Vul de waarden handmatig in.'
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-meal:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
