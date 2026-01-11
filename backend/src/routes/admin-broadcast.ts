import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { requireAdmin, logAdminAction } from '../middleware/admin.js';
import { query } from '../config/database.js';
import { sendEmail } from '../services/email.js';

const router = Router();

// All routes require admin
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================
// BROADCAST MESSAGING
// ============================================

const BroadcastSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1),
  target: z.enum(['all', 'premium', 'free', 'custom']),
  custom_emails: z.array(z.string().email()).optional(),
  send_immediately: z.boolean().default(false),
  scheduled_at: z.string().datetime().optional(),
});

/**
 * POST /api/admin-broadcast/send
 * Send broadcast message to users
 */
router.post('/send', async (req: AuthRequest, res: Response) => {
  try {
    const data = BroadcastSchema.parse(req.body);

    // Get target users
    let targetUsers: any[] = [];

    if (data.target === 'custom' && data.custom_emails) {
      const result = await query(
        `SELECT id, email, full_name FROM users WHERE email = ANY($1)`,
        [data.custom_emails]
      );
      targetUsers = result.rows;

    } else if (data.target === 'all') {
      const result = await query(
        `SELECT id, email, full_name FROM users`
      );
      targetUsers = result.rows;

    } else if (data.target === 'premium') {
      const result = await query(
        `SELECT id, email, full_name FROM users WHERE is_premium = TRUE`
      );
      targetUsers = result.rows;

    } else if (data.target === 'free') {
      const result = await query(
        `SELECT id, email, full_name FROM users WHERE is_premium = FALSE`
      );
      targetUsers = result.rows;
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({
        error: 'No users found',
        message: 'Geen gebruikers gevonden voor deze selectie.'
      });
    }

    // Store broadcast in database
    const broadcastResult = await query(`
      INSERT INTO broadcasts (
        admin_user_id,
        subject,
        message,
        target_type,
        recipient_count,
        status,
        scheduled_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      req.user!.userId,
      data.subject,
      data.message,
      data.target,
      targetUsers.length,
      data.send_immediately ? 'sending' : 'scheduled',
      data.scheduled_at || null
    ]);

    const broadcastId = broadcastResult.rows[0].id;

    // Send emails immediately or schedule
    if (data.send_immediately) {
      // Send in batches to avoid rate limiting
      const batchSize = 50;
      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < targetUsers.length; i += batchSize) {
        const batch = targetUsers.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (user) => {
            try {
              const success = await sendBroadcastEmail(
                user.email,
                user.full_name || 'daar',
                data.subject,
                data.message
              );

              if (success) {
                sentCount++;
              } else {
                failedCount++;
              }

              // Log individual send
              await query(`
                INSERT INTO broadcast_recipients (broadcast_id, user_id, email, status)
                VALUES ($1, $2, $3, $4)
              `, [broadcastId, user.id, user.email, success ? 'sent' : 'failed']);

            } catch (error) {
              console.error(`Failed to send to ${user.email}:`, error);
              failedCount++;
            }
          })
        );

        // Small delay between batches to respect rate limits
        if (i + batchSize < targetUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update broadcast status
      await query(`
        UPDATE broadcasts
        SET status = 'completed',
            sent_count = $1,
            failed_count = $2,
            sent_at = NOW()
        WHERE id = $3
      `, [sentCount, failedCount, broadcastId]);

      await logAdminAction(
        req.user!.userId,
        'SEND_BROADCAST',
        'broadcasts',
        broadcastId,
        { subject: data.subject, target: data.target, sent: sentCount, failed: failedCount }
      );

      res.json({
        success: true,
        message: `Broadcast verzonden naar ${sentCount} gebruikers (${failedCount} mislukt)`,
        data: {
          broadcastId,
          sentCount,
          failedCount,
          totalRecipients: targetUsers.length
        }
      });

    } else {
      // Scheduled - store recipients
      for (const user of targetUsers) {
        await query(`
          INSERT INTO broadcast_recipients (broadcast_id, user_id, email, status)
          VALUES ($1, $2, $3, 'pending')
        `, [broadcastId, user.id, user.email]);
      }

      await logAdminAction(
        req.user!.userId,
        'SCHEDULE_BROADCAST',
        'broadcasts',
        broadcastId,
        { subject: data.subject, target: data.target, scheduled_at: data.scheduled_at }
      );

      res.json({
        success: true,
        message: `Broadcast ingepland voor ${targetUsers.length} gebruikers`,
        data: {
          broadcastId,
          scheduledAt: data.scheduled_at,
          recipientCount: targetUsers.length
        }
      });
    }

  } catch (error: any) {
    console.error('Broadcast send error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    res.status(500).json({
      error: 'Failed to send broadcast',
      message: 'Er ging iets mis bij het versturen van de broadcast.'
    });
  }
});

/**
 * GET /api/admin-broadcast/history
 * Get broadcast history
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT
        b.id,
        b.subject,
        b.target_type,
        b.recipient_count,
        b.sent_count,
        b.failed_count,
        b.status,
        b.created_at,
        b.sent_at,
        b.scheduled_at,
        u.email as admin_email
      FROM broadcasts b
      JOIN users u ON b.admin_user_id = u.id
      ORDER BY b.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await query('SELECT COUNT(*) FROM broadcasts');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        broadcasts: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get broadcast history error:', error);
    res.status(500).json({ error: 'Failed to get broadcast history' });
  }
});

/**
 * GET /api/admin-broadcast/:id/recipients
 * Get recipients for a specific broadcast
 */
router.get('/:id/recipients', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        br.email,
        br.status,
        br.sent_at,
        u.full_name
      FROM broadcast_recipients br
      LEFT JOIN users u ON br.user_id = u.id
      WHERE br.broadcast_id = $1
      ORDER BY br.sent_at DESC NULLS LAST
    `, [id]);

    res.json({
      success: true,
      data: { recipients: result.rows }
    });

  } catch (error) {
    console.error('Get broadcast recipients error:', error);
    res.status(500).json({ error: 'Failed to get recipients' });
  }
});

/**
 * Helper function to send broadcast email
 */
async function sendBroadcastEmail(
  to: string,
  name: string,
  subject: string,
  message: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #9b87f5 0%, #7E69AB 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .message { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; white-space: pre-line; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Perimenopauze Plan 🌸</h1>
        </div>
        <div class="content">
          <p>Hoi ${name},</p>

          <div class="message">
            ${message}
          </div>

          <p>Met vriendelijke groet,<br>
          Het Perimenopauze Plan Team</p>
        </div>
        <div class="footer">
          <p>Deze email is verstuurd omdat je lid bent van Perimenopauze Plan.</p>
          <p>Wil je geen updates meer ontvangen? <a href="${process.env.FRONTEND_URL}/instellingen">Wijzig je voorkeuren</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to, subject, html });
}

export default router;
