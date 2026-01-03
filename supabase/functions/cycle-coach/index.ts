import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `Je bent CycleCoach, een warme en nuchtere begeleider voor vrouwen in de perimenopauze. 
Je geeft evidence-informed advies gebaseerd op kPNI en orthomoleculaire principes (bloedsuikermanagement, stress-as, slaap, ontsteking, micronutriënten, training load).

KERNREGELS:
- Nooit oordelen of moraliseren
- Geen medische claims, wel praktische tips
- Bij alarmsignalen (extreem bloedverlies, duizeligheid, aanhoudende pijn): adviseer contact met huisarts
- Houd rekening met perimenopauze: cycli zijn vaak wisselend en onvoorspelbaar
- Wees kort, praktisch en warm

Je krijgt:
- Cyclusdata van de laatste 90 dagen
- Symptoomlogs
- Berekende voorspellingen en statistieken

Geef output ALLEEN als valide JSON in dit formaat:
{
  "seasonNow": "winter" | "lente" | "zomer" | "herfst",
  "phaseNow": "menstruatie" | "folliculair" | "ovulatie" | "luteaal",
  "confidence": 0-100,
  "confidenceExplanation": "1 korte zin",
  "todayTips": {
    "voedingTip": "1-2 zinnen over eten",
    "trainingTip": "1-2 zinnen over bewegen",
    "werkTip": "1-2 zinnen over focus/productiviteit",
    "herstelTip": "1-2 zinnen over rust/stress"
  },
  "watchouts": ["max 2 signalen die aandacht vragen"],
  "insight": "1 observatie over patronen in de data, bijv. 'Je lijkt in de luteale fase vaker hoofdpijn te hebben'"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      cycles, 
      bleedingLogs, 
      symptomLogs, 
      fertilitySignals,
      preferences,
      baselinePrediction 
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context for AI
    const context = `
CYCLUS DATA (laatste 6 cycli):
${JSON.stringify(cycles || [], null, 2)}

BLOEDVERLIES LOGS (laatste 90 dagen):
${JSON.stringify(bleedingLogs?.slice(0, 30) || [], null, 2)}

SYMPTOOM LOGS (laatste 90 dagen):
${JSON.stringify(symptomLogs?.slice(0, 30) || [], null, 2)}

VRUCHTBAARHEID SIGNALEN:
${JSON.stringify(fertilitySignals?.slice(0, 14) || [], null, 2)}

GEBRUIKER PROFIEL:
- Perimenopauze: ${preferences?.perimenopause ? 'ja' : 'onbekend'}
- PCOS: ${preferences?.pcos ? 'ja' : 'nee'}
- Hormonale anticonceptie: ${preferences?.hormonal_contraception ? 'ja' : 'nee'}
- Luteale fase lengte instelling: ${preferences?.luteal_phase_length || 13} dagen

BASELINE BEREKENINGEN:
- Gemiddelde cycluslengte: ${baselinePrediction?.avg_cycle_length || 'onbekend'} dagen
- Variabiliteit: ±${baselinePrediction?.cycle_variability || 'onbekend'} dagen
- Huidige fase (baseline): ${baselinePrediction?.current_phase || 'onbekend'}
- Huidige seizoen (baseline): ${baselinePrediction?.current_season || 'onbekend'}
- Baseline confidence: ${baselinePrediction?.next_period_confidence || 'onbekend'}%

Analyseer deze data en geef gepersonaliseerde tips voor vandaag.
`;

    console.log('Calling CycleCoach AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context }
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
        return new Response(JSON.stringify({ error: 'AI credits zijn op.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('CycleCoach response:', content);

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return baseline with fallback tips
      result = {
        seasonNow: baselinePrediction?.current_season || 'onbekend',
        phaseNow: baselinePrediction?.current_phase || 'onbekend',
        confidence: baselinePrediction?.next_period_confidence || 50,
        confidenceExplanation: 'Gebaseerd op je recente logs.',
        todayTips: {
          voedingTip: 'Focus op gevarieerd eten met voldoende eiwit en groenten.',
          trainingTip: 'Beweeg op een manier die goed voelt voor jou vandaag.',
          werkTip: 'Luister naar je energie en plan je taken flexibel.',
          herstelTip: 'Zorg voor voldoende rust en momenten van ontspanning.',
        },
        watchouts: [],
        insight: 'Log meer dagen om persoonlijke patronen te ontdekken.',
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cycle-coach:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
