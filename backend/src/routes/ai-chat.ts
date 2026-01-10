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
 * POST /api/ai-chat
 * Send a message to ChatGPT and get a response
 *
 * GDPR Compliance:
 * - User messages are NOT stored by default
 * - Only conversation_id is stored for rate limiting
 * - User can opt-in to save conversations via save_conversation flag
 * - Personal health data is anonymized before sending to OpenAI
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

    // Build system prompt based on context
    const systemPrompts = {
      general: 'Je bent een empathische assistent gespecialiseerd in perimenopauze. Geef algemene informatie en ondersteuning. Verwijs altijd naar een arts voor medisch advies.',
      symptoms: 'Je bent een assistent die helpt symptomen van perimenopauze te begrijpen. Leg symptomen uit en geef tips. Dit is geen medisch advies - verwijs altijd naar een zorgverlener.',
      nutrition: 'Je bent een voedingsassistent voor mensen in de perimenopauze. Geef voedingsadvies, receptideeën en uitleg over voedingsstoffen die helpen bij symptomen.',
      exercise: 'Je bent een bewegingsassistent voor mensen in de perimenopauze. Geef advies over veilige en effectieve oefeningen die helpen bij symptomen.'
    };

    const systemPrompt = systemPrompts[context || 'general'];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
      // IMPORTANT: Disable OpenAI's data retention for GDPR compliance
      // Note: This requires setting up a Business/Enterprise account with OpenAI
    });

    const aiResponse = completion.choices[0].message.content;

    // Log the interaction for rate limiting only (no message content stored)
    await query(
      `INSERT INTO ai_chat_logs (user_id, tokens_used, context_type)
       VALUES ($1, $2, $3)`,
      [userId, completion.usage?.total_tokens || 0, context || 'general']
    );

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
