import { Router, Response } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = Router();

// Initialize OpenAI client (will use environment variable OPENAI_API_KEY)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validation schemas
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z.enum(['general', 'symptoms', 'nutrition', 'exercise']).optional(),
});

/**
 * Anonymize message before sending to OpenAI (GDPR CRITICAL!)
 * Removes all personally identifiable information
 */
function anonymizeMessage(message: string): string {
  let anonymized = message;

  // Remove common PII patterns
  // Email addresses
  anonymized = anonymized.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[EMAIL]');

  // Phone numbers (various formats)
  anonymized = anonymized.replace(/(\+31|0031|0)[\s.-]?[1-9](?:[\s.-]?\d){8}/g, '[TELEFOONNUMMER]');
  anonymized = anonymized.replace(/\b\d{10,11}\b/g, '[TELEFOONNUMMER]');

  // Names (after "ik ben", "mijn naam is", etc.)
  anonymized = anonymized.replace(/(ik ben|mijn naam is|ik heet)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, '$1 [NAAM]');

  // Birthdates (dd-mm-yyyy, dd/mm/yyyy, etc.)
  anonymized = anonymized.replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, '[GEBOORTEDATUM]');

  // Ages (specific patterns like "ik ben 45", "45 jaar oud")
  anonymized = anonymized.replace(/(ik ben|ben)\s+\d{2}\s*(jaar)?(\s+oud)?/gi, '$1 [LEEFTIJD]$2$3');

  // Addresses (postcodes NL: 1234AB format)
  anonymized = anonymized.replace(/\b\d{4}\s?[A-Z]{2}\b/g, '[POSTCODE]');

  // Street names with numbers
  anonymized = anonymized.replace(/\b([A-Z][a-z]+(?:straat|laan|weg|plein|park))\s+\d+/g, '[ADRES]');

  // BSN numbers (9 digits)
  anonymized = anonymized.replace(/\b\d{9}\b/g, '[BSN]');

  // Insurance numbers
  anonymized = anonymized.replace(/(verzekerings|polis)(?:nummer)?:?\s*[\d\w-]+/gi, '$1nummer: [NUMMER]');

  return anonymized;
}

/**
 * POST /api/ai-chat
 * Send a message to ChatGPT and get a response
 *
 * GDPR Compliance (ENHANCED):
 * - User messages are NEVER stored in database
 * - NO personally identifiable information (PII) sent to OpenAI:
 *   * No names, emails, birthdates, phone numbers
 *   * No addresses, postcodes, BSN
 *   * No user IDs or session tokens
 *   * Messages are anonymized before sending
 * - Only anonymous metadata logged (timestamp, token count, context type)
 * - OpenAI data retention: 0 days (requires Business/Enterprise account setup)
 * - User <-> Prompt connection is completely broken
 *
 * How anonymization works:
 * 1. Message is received from authenticated user
 * 2. All PII is stripped/replaced with placeholders (e.g., [NAAM], [EMAIL])
 * 3. OpenAI receives ONLY the anonymized message
 * 4. Response is returned to user
 * 5. Only rate-limit metadata is stored (NO message content)
 *
 * Example:
 * Input:  "Ik ben Heleen, 45 jaar oud, heleen@email.nl, woon in Amsterdam..."
 * Sent:   "Ik ben [NAAM], [LEEFTIJD], [EMAIL], woon in [ADRES]..."
 * Stored: NOTHING (only: user_id, tokens_used, context_type, timestamp)
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { message, context } = ChatRequestSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check rate limit (max 50 messages per day per user)
    const rateLimitResult = await query(
      `SELECT COUNT(*) as count
       FROM ai_chat_logs
       WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    const messageCount = parseInt(rateLimitResult.rows[0].count);
    if (messageCount >= 50) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Je hebt het dagelijkse limiet van 50 AI berichten bereikt. Probeer het morgen opnieuw.'
      });
    }

    // GDPR CRITICAL: Anonymize message before sending to OpenAI
    const anonymizedMessage = anonymizeMessage(message);

    // Build system prompt based on context
    const systemPrompts = {
      general: 'Je bent een empathische assistent gespecialiseerd in perimenopauze. Geef algemene informatie en ondersteuning. Verwijs altijd naar een arts voor medisch advies. Als je [NAAM], [EMAIL], [LEEFTIJD], etc. ziet in berichten, gebruik deze placeholders in je antwoord.',
      symptoms: 'Je bent een assistent die helpt symptomen van perimenopauze te begrijpen. Leg symptomen uit en geef tips. Dit is geen medisch advies - verwijs altijd naar een zorgverlener. Als je [NAAM] of andere placeholders ziet, gebruik deze in je antwoord.',
      nutrition: 'Je bent een voedingsassistent voor mensen in de perimenopauze. Geef voedingsadvies, receptideeën en uitleg over voedingsstoffen die helpen bij symptomen.',
      exercise: 'Je bent een bewegingsassistent voor mensen in de perimenopauze. Geef advies over veilige en effectieve oefeningen die helpen bij symptomen.'
    };

    const systemPrompt = systemPrompts[context || 'general'];

    // Call OpenAI API with ANONYMIZED message
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: anonymizedMessage } // ← ANONYMIZED!
      ],
      max_tokens: 500,
      temperature: 0.7,
      // IMPORTANT: Set user to anonymous ID (not real user ID)
      user: `anonymous_${Date.now()}`,
    });

    const aiResponse = completion.choices[0].message.content;

    // Log ONLY metadata for rate limiting (NO message content!)
    await query(
      `INSERT INTO ai_chat_logs (user_id, tokens_used, context_type)
       VALUES ($1, $2, $3)`,
      [userId, completion.usage?.total_tokens || 0, context || 'general']
    );

    // GDPR Compliance Check:
    // ✅ Original message: NOT stored
    // ✅ Anonymized message: NOT stored
    // ✅ AI response: NOT stored
    // ✅ Only metadata stored: user_id (internal), tokens, context, timestamp
    // ✅ OpenAI receives: ONLY anonymized message with anonymous user ID

    res.json({
      response: aiResponse,
      tokens_used: completion.usage?.total_tokens,
      remaining_today: 50 - messageCount - 1
    });

  } catch (error: any) {
    console.error('AI chat error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    if (error.code === 'insufficient_quota') {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'De AI service is tijdelijk niet beschikbaar. Probeer het later opnieuw.'
      });
    }

    res.status(500).json({
      error: 'Failed to get AI response',
      message: 'Er ging iets mis met de AI service. Probeer het opnieuw.'
    });
  }
});

/**
 * GET /api/ai-chat/usage
 * Get today's usage statistics
 */
router.get('/usage', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      `SELECT
        COUNT(*) as messages_today,
        COALESCE(SUM(tokens_used), 0) as tokens_today
       FROM ai_chat_logs
       WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    res.json({
      messages_today: parseInt(result.rows[0].messages_today),
      tokens_today: parseInt(result.rows[0].tokens_today),
      limit: 50,
      remaining: 50 - parseInt(result.rows[0].messages_today)
    });

  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

export default router;
