import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');

    // Execute schema
    await pool.query(schema);

    console.log('✅ Database schema created successfully');

    // Insert default AI prompts
    await insertDefaultPrompts();

    console.log('✅ Database setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

async function insertDefaultPrompts() {
  const prompts = [
    {
      key: 'analyze-meal',
      text: `Analyseer deze maaltijd en geef voedingsadvies gebaseerd op de perimenopauzefase van de gebruiker.

Maaltijdbeschrijving: {{meal_description}}
Gebruiker cyclus fase: {{cycle_phase}}
Symptomen: {{symptoms}}

Geef specifiek advies over nutriënten, hormoonbalans en energieniveaus.`,
      variables: ['meal_description', 'cycle_phase', 'symptoms']
    },
    {
      key: 'cycle-coach',
      text: `Je bent een expert in perimenopauze en cyclus begeleiding. Beantwoord de vraag van de gebruiker met persoonlijk, wetenschappelijk onderbouwd advies.

Vraag: {{question}}
Huidige cyclus data: {{cycle_data}}
Recente symptomen: {{symptoms}}

Geef praktisch advies dat de gebruiker direct kan toepassen.`,
      variables: ['question', 'cycle_data', 'symptoms']
    },
    {
      key: 'daily-analysis',
      text: `Analyseer de dagelijkse data van de gebruiker en geef een samenvatting met inzichten.

Datum: {{date}}
Dagboek: {{diary_entry}}
Symptomen: {{symptoms}}
Slaap: {{sleep_data}}
Beweging: {{movement_data}}
Voeding: {{meal_data}}

Geef een beknopte analyse met focus op patronen en verbeterpunten.`,
      variables: ['date', 'diary_entry', 'symptoms', 'sleep_data', 'movement_data', 'meal_data']
    },
    {
      key: 'monthly-analysis',
      text: `Maak een maandoverzicht van de perimenopauze progressie van de gebruiker.

Periode: {{start_date}} tot {{end_date}}
Cyclus data: {{cycle_summary}}
Symptomen trends: {{symptom_trends}}
Leefstijl data: {{lifestyle_summary}}

Identificeer patronen, vooruitgang en aandachtspunten voor de volgende maand.`,
      variables: ['start_date', 'end_date', 'cycle_summary', 'symptom_trends', 'lifestyle_summary']
    }
  ];

  for (const prompt of prompts) {
    await pool.query(
      `INSERT INTO ai_prompts (prompt_key, prompt_text, variables, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (prompt_key) DO UPDATE SET
         prompt_text = EXCLUDED.prompt_text,
         variables = EXCLUDED.variables`,
      [prompt.key, prompt.text, prompt.variables, `AI prompt for ${prompt.key}`]
    );
  }

  console.log('✅ Default AI prompts inserted');
}

setupDatabase();
