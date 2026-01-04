import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// COMPLIANCE SYSTEM PROMPT - Alleen voedingsanalyse, geen medisch advies
const systemPrompt = `Je bent een voedingsexpert die maaltijden analyseert.

BELANGRIJKE RICHTLIJNEN:
- Je bent GEEN arts of diëtist met behandelrelatie
- Je geeft GEEN medisch voedingsadvies
- Je stelt GEEN diagnoses over voedingsgerelateerde aandoeningen
- Je doet GEEN uitspraken over allergieën of intoleranties

Je taak:
- Schat voedingswaarden van een maaltijd
- Geef een objectieve beschrijving

PRIVACY:
- Je ontvangt ALLEEN een beschrijving of foto van een maaltijd
- GEEN persoonlijke gegevens, geen context over de gebruiker

Antwoord ALLEEN met een JSON object in dit formaat (geen andere tekst):
{
  "description": "korte, neutrale beschrijving van de maaltijd",
  "kcal": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "confidence": "high" | "medium" | "low",
  "notes": "optionele neutrale opmerking over de schatting"
}

Richtlijnen:
- Wees realistisch met portiegroottes
- Bij twijfel, kies een gemiddelde portie
- Geef confidence "low" als de beschrijving vaag is
- Alle getallen zijn integers of floats, geen strings
- GEEN uitspraken over of de maaltijd "gezond" of "ongezond" is
- GEEN oordelen over voedingskeuzes`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, imageBase64, hasAIConsent } = await req.json();
    
    // CONSENT CHECK
    if (hasAIConsent === false) {
      return new Response(JSON.stringify({
        error: 'consent_required',
        message: 'Om AI-analyse te gebruiken is toestemming nodig. Schakel dit in bij Instellingen.',
        description: description || 'Maaltijd',
        kcal: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        fiber_g: null,
        confidence: 'low',
        notes: 'Vul de waarden handmatig in of schakel AI-ondersteuning in bij Instellingen.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Use OpenAI API key from Supabase secrets
    const OPENAI_API_KEY = Deno.env.get('ChatGPT');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    // PRIVACY: We sturen ALLEEN de maaltijdbeschrijving naar AI
    // Geen user_id, geen timestamps, geen andere persoonsgegevens
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

    console.log('Sending meal data to OpenAI (no personal info, only food description)');
    
    // Direct call to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Te veel verzoeken. Probeer het later opnieuw.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI meal analysis received');

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
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
