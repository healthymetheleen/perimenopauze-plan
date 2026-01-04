import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PRIVACY: AI ontvangt alleen geanonimiseerde statistieken, geen herleidbare data
const systemPrompt = `Je bent CycleCoach, een warme en nuchtere begeleider voor vrouwen in de perimenopauze. 
Je geeft evidence-informed advies gebaseerd op kPNI en orthomoleculaire principes.

PRIVACY: Je ontvangt ALLEEN geanonimiseerde statistieken:
- Gemiddelde cycluslengte en variabiliteit
- Symptoomfrequenties (niet de exacte datums)
- Huidige cyclusfase
- Geen namen, geen user IDs, geen exacte datums

KERNREGELS:
- Nooit oordelen of moraliseren
- Geen medische claims, wel praktische tips
- Bij alarmsignalen (extreem bloedverlies, duizeligheid): adviseer contact met huisarts
- Wees kort, praktisch en warm

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
  "insight": "1 observatie over patronen"
}`;

// Helper: anonimiseer data door alleen statistieken te berekenen
function anonymizeData(input: {
  cycles?: any[];
  bleedingLogs?: any[];
  symptomLogs?: any[];
  preferences?: any;
  baselinePrediction?: any;
}) {
  const { cycles, bleedingLogs, symptomLogs, preferences, baselinePrediction } = input;
  
  // Bereken statistieken zonder exacte datums door te geven
  const cycleLengths = (cycles || [])
    .filter(c => c.computed_cycle_length)
    .map(c => c.computed_cycle_length);
  
  const avgCycleLength = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : null;
  
  const cycleVariability = cycleLengths.length > 1
    ? Math.round(Math.max(...cycleLengths) - Math.min(...cycleLengths))
    : null;

  // Tel symptomen zonder exacte datums
  const symptomCounts: Record<string, number> = {};
  (symptomLogs || []).forEach((log: any) => {
    const symptoms = ['headache', 'bloating', 'anxiety', 'irritability', 'breast_tender', 'hot_flashes'];
    symptoms.forEach(s => {
      if (log[s]) {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      }
    });
  });

  // Bloedingspatroon zonder datums
  const bleedingIntensities = (bleedingLogs || []).map((b: any) => b.intensity);
  const hasHeavyBleeding = bleedingIntensities.includes('heavy') || bleedingIntensities.includes('very_heavy');
  
  // Alleen relevante profileringen, geen IDs
  return {
    stats: {
      avgCycleLength,
      cycleVariability,
      totalCyclesTracked: cycleLengths.length,
      symptomCounts,
      hasHeavyBleeding,
      bleedingDaysLast30: bleedingLogs?.length || 0,
    },
    profile: {
      perimenopause: preferences?.perimenopause || false,
      pcos: preferences?.pcos || false,
      hormonalContraception: preferences?.hormonal_contraception || false,
      lutealPhaseLength: preferences?.luteal_phase_length || 13,
    },
    currentPhase: {
      phase: baselinePrediction?.current_phase || 'unknown',
      season: baselinePrediction?.current_season || 'unknown',
      confidence: baselinePrediction?.next_period_confidence || 50,
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const inputData = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // PRIVACY: Anonimiseer alle data voordat het naar AI gaat
    const anonymized = anonymizeData(inputData);
    
    console.log('Sending anonymized stats to AI (no personal identifiers):', JSON.stringify(anonymized.stats));

    // Bouw context met ALLEEN geanonimiseerde data
    const context = `
GEANONIMISEERDE CYCLUS STATISTIEKEN:
- Gemiddelde cycluslengte: ${anonymized.stats.avgCycleLength || 'onbekend'} dagen
- Variabiliteit: ±${anonymized.stats.cycleVariability || 'onbekend'} dagen
- Aantal getrackte cycli: ${anonymized.stats.totalCyclesTracked}
- Bloedingsdagen afgelopen 30 dagen: ${anonymized.stats.bleedingDaysLast30}
- Zwaar bloedverlies recent: ${anonymized.stats.hasHeavyBleeding ? 'ja' : 'nee'}

SYMPTOOM FREQUENTIES (aantal keer gelogd):
${Object.entries(anonymized.stats.symptomCounts).map(([k, v]) => `- ${k}: ${v}x`).join('\n') || '- Geen symptomen gelogd'}

PROFIEL:
- Perimenopauze: ${anonymized.profile.perimenopause ? 'ja' : 'onbekend'}
- PCOS: ${anonymized.profile.pcos ? 'ja' : 'nee'}
- Hormonale anticonceptie: ${anonymized.profile.hormonalContraception ? 'ja' : 'nee'}
- Luteale fase lengte: ${anonymized.profile.lutealPhaseLength} dagen

HUIDIGE FASE:
- Fase: ${anonymized.currentPhase.phase}
- Seizoen: ${anonymized.currentPhase.season}
- Confidence: ${anonymized.currentPhase.confidence}%

Geef gepersonaliseerde tips gebaseerd op deze geanonimiseerde statistieken.
`;

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
    
    console.log('CycleCoach response received (based on anonymized data)');

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
      result = {
        seasonNow: anonymized.currentPhase.season || 'onbekend',
        phaseNow: anonymized.currentPhase.phase || 'onbekend',
        confidence: anonymized.currentPhase.confidence || 50,
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
