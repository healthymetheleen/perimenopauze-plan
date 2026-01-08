-- Insert additional AI prompts for edge functions that now use dynamic prompts
-- These are user prompt templates that complement the system prompts

INSERT INTO public.ai_prompts (prompt_key, name, description, category, prompt_nl, prompt_en, is_system_prompt)
VALUES 
  (
    'weekly_nutrition_user',
    'Weekanalyse Voeding - Gebruiker',
    'User prompt template voor weekelijkse voedingsanalyse met placeholder voor data',
    'nutrition',
    'Analyseer deze weekelijkse voedingsdata en geef een persoonlijk weekadvies:

{{nutritionSummary}}

Geef je analyse in dit exact JSON format. BELANGRIJK: Gebruik NOOIT technische day-codes (D-1, D-2, etc.) in je tekst - schrijf in normale taal.
{
  "samenvatting": "Korte samenvatting van de week in 1-2 zinnen",
  "sterke_punten": ["punt 1", "punt 2"],
  "aandachtspunten": ["punt 1", "punt 2"],
  "leefstijl_tip": {
    "titel": "Concrete tip voor deze week",
    "uitleg": "Waarom dit helpt",
    "voedingsmiddelen": ["voedingsmiddel 1", "voedingsmiddel 2", "voedingsmiddel 3"]
  },
  "weekdoel": "Één specifiek, haalbaar doel voor komende week"
}',
    'Analyze this weekly nutrition data and provide personal weekly advice:

{{nutritionSummary}}

Provide your analysis in this exact JSON format. IMPORTANT: NEVER use technical day-codes (D-1, D-2, etc.) in your text - write in normal language.
{
  "samenvatting": "Short summary of the week in 1-2 sentences",
  "sterke_punten": ["point 1", "point 2"],
  "aandachtspunten": ["point 1", "point 2"],
  "leefstijl_tip": {
    "titel": "Concrete tip for this week",
    "uitleg": "Why this helps",
    "voedingsmiddelen": ["food item 1", "food item 2", "food item 3"]
  },
  "weekdoel": "One specific, achievable goal for the coming week"
}',
    false
  )
ON CONFLICT (prompt_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  prompt_nl = EXCLUDED.prompt_nl,
  prompt_en = EXCLUDED.prompt_en,
  updated_at = now();