import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { createMollieClient, PaymentStatus } from '@mollie/api-client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { sendSubscriptionConfirmationEmail, sendPaymentFailedEmail } from '../services/email.js';

const router = Router();

// Initialize Mollie client
const mollieClient = createMollieClient({
  apiKey: process.env.MOLLIE_API_KEY || '',
});

// Validation schemas
const CreateSubscriptionSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

// Subscription plans
const PLANS = {
  monthly: {
    name: 'Premium Maandelijks',
    amount: '9.99',
    interval: '1 month',
    description: 'Premium toegang voor 1 maand',
  },
  yearly: {
    name: 'Premium Jaarlijks',
    amount: '99.99',
    interval: '1 year',
    description: 'Premium toegang voor 1 jaar (2 maanden gratis!)',
  },
};

/**
 * POST /api/payments/create-subscription
 * Create a new subscription payment
 */
router.post('/create-subscription', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = CreateSubscriptionSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check if user already has an active subscription
    const existingSubResult = await query(
      `SELECT id, status FROM subscriptions
       WHERE user_id = $1
       AND status IN ('active', 'pending')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (existingSubResult.rows.length > 0) {
      return res.status(400).json({
        error: 'Active subscription exists',
        message: 'Je hebt al een actief abonnement.'
      });
    }

    const selectedPlan = PLANS[plan];

    // Create first payment with Mollie
    const payment = await mollieClient.payments.create({
      amount: {
        currency: 'EUR',
        value: selectedPlan.amount,
      },
      description: selectedPlan.description,
      redirectUrl: `${process.env.FRONTEND_URL}/subscription/success`,
      webhookUrl: `${process.env.BACKEND_URL}/api/payments/webhook`,
      metadata: {
        userId: userId.toString(),
        plan,
        type: 'subscription_first_payment',
      },
    });

    // Store subscription in database
    await query(
      `INSERT INTO subscriptions (
        user_id,
        mollie_customer_id,
        mollie_payment_id,
        plan_type,
        amount,
        interval_months,
        status,
        next_payment_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '${selectedPlan.interval}')`,
      [
        userId,
        null, // Will be set after first payment
        payment.id,
        plan,
        selectedPlan.amount,
        plan === 'monthly' ? 1 : 12,
        'pending'
      ]
    );

    res.json({
      paymentUrl: payment.getCheckoutUrl(),
      paymentId: payment.id,
      amount: selectedPlan.amount,
    });

  } catch (error: any) {
    console.error('Create subscription error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    res.status(500).json({
      error: 'Failed to create subscription',
      message: 'Er ging iets mis bij het starten van het abonnement. Probeer het opnieuw.'
    });
  }
});

/**
 * POST /api/payments/webhook
 * Handle Mollie webhook for payment status updates
 * IMPORTANT: This endpoint is called by Mollie, not by the frontend
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const paymentId = req.body.id;

    if (!paymentId) {
      console.error('Webhook called without payment ID');
      return res.status(400).send('Missing payment ID');
    }

    // Get payment details from Mollie
    const payment = await mollieClient.payments.get(paymentId);

    const userId = parseInt(payment.metadata.userId as string);
    const plan = payment.metadata.plan as 'monthly' | 'yearly';
    const paymentType = payment.metadata.type as string;

    console.log(`Webhook received for payment ${paymentId}, status: ${payment.status}`);

    if (payment.status === PaymentStatus.paid) {
      // Payment successful!

      if (paymentType === 'subscription_first_payment') {
        // First payment - activate subscription

        // Create or get Mollie customer
        let customerId = payment.customerId;
        if (!customerId) {
          // Get user email
          const userResult = await query(
            'SELECT email, profiles.full_name FROM users LEFT JOIN profiles ON users.id = profiles.user_id WHERE users.id = $1',
            [userId]
          );
          const user = userResult.rows[0];

          const customer = await mollieClient.customers.create({
            email: user.email,
            name: user.full_name || 'Perimenopauze Plan User',
          });
          customerId = customer.id;
        }

        // Update subscription to active
        await query(
          `UPDATE subscriptions
           SET status = 'active',
               mollie_customer_id = $1,
               activated_at = NOW()
           WHERE mollie_payment_id = $2`,
          [customerId, paymentId]
        );

        // Update user to premium
        await query(
          'UPDATE users SET is_premium = true WHERE id = $1',
          [userId]
        );

        // Create recurring subscription mandate with Mollie
        // This allows automatic future payments
        const selectedPlan = PLANS[plan];
        await mollieClient.subscriptions.create({
          customerId: customerId!,
          amount: {
            currency: 'EUR',
            value: selectedPlan.amount,
          },
          interval: selectedPlan.interval,
          description: selectedPlan.name,
          webhookUrl: `${process.env.BACKEND_URL}/api/payments/webhook`,
          metadata: {
            userId: userId.toString(),
            plan,
            type: 'recurring_payment',
          },
        });

        // Send confirmation email
        const userResult = await query(
          'SELECT email, profiles.full_name FROM users LEFT JOIN profiles ON users.id = profiles.user_id WHERE users.id = $1',
          [userId]
        );
        const user = userResult.rows[0];
        await sendSubscriptionConfirmationEmail(
          user.email,
          user.full_name || 'daar',
          selectedPlan.name
        );

        console.log(`Subscription activated for user ${userId}`);
      }

      if (paymentType === 'recurring_payment') {
        // Recurring payment - extend subscription
        await query(
          `UPDATE subscriptions
           SET next_payment_date = next_payment_date + INTERVAL '${plan === 'monthly' ? '1 month' : '1 year'}',
               last_payment_date = NOW()
           WHERE user_id = $1 AND status = 'active'`,
          [userId]
        );

        console.log(`Recurring payment processed for user ${userId}`);
      }

    } else if (payment.status === PaymentStatus.failed || payment.status === PaymentStatus.expired) {
      // Payment failed

      if (paymentType === 'subscription_first_payment') {
        // First payment failed - mark subscription as failed
        await query(
          `UPDATE subscriptions
           SET status = 'failed'
           WHERE mollie_payment_id = $1`,
          [paymentId]
        );
      }

      if (paymentType === 'recurring_payment') {
        // Recurring payment failed - send notification
        const userResult = await query(
          'SELECT email, profiles.full_name FROM users LEFT JOIN profiles ON users.id = profiles.user_id WHERE users.id = $1',
          [userId]
        );
        const user = userResult.rows[0];
        await sendPaymentFailedEmail(user.email, user.full_name || 'daar');

        // Grace period: keep subscription active for 7 days
        await query(
          `UPDATE subscriptions
           SET status = 'payment_failed',
               grace_period_ends = NOW() + INTERVAL '7 days'
           WHERE user_id = $1 AND status = 'active'`,
          [userId]
        );
      }

      console.log(`Payment failed for user ${userId}`);
    }

    // Always respond with 200 to Mollie
    res.status(200).send('OK');

  } catch (error: any) {
    console.error('Webhook error:', error);
    // Still respond with 200 to prevent Mollie from retrying
    res.status(200).send('ERROR');
  }
});

/**
 * POST /api/payments/cancel-subscription
 * Cancel active subscription
 */
router.post('/cancel-subscription', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get active subscription
    const subResult = await query(
      `SELECT id, mollie_customer_id, mollie_subscription_id
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No active subscription',
        message: 'Je hebt geen actief abonnement om te annuleren.'
      });
    }

    const subscription = subResult.rows[0];

    // Cancel in Mollie
    if (subscription.mollie_customer_id && subscription.mollie_subscription_id) {
      await mollieClient.subscriptionsCancellations.create({
        customerId: subscription.mollie_customer_id,
        subscriptionId: subscription.mollie_subscription_id,
      });
    }

    // Mark as cancelled in database (but keep premium until end of period)
    await query(
      `UPDATE subscriptions
       SET status = 'cancelled',
           cancelled_at = NOW()
       WHERE id = $1`,
      [subscription.id]
    );

    res.json({
      message: 'Abonnement geannuleerd. Je premium toegang blijft actief tot het einde van de betaalde periode.',
      expiresAt: subscription.next_payment_date
    });

  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: 'Er ging iets mis bij het annuleren. Neem contact op met support.'
    });
  }
});

/**
 * GET /api/payments/subscription-status
 * Get current subscription status
 */
router.get('/subscription-status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      `SELECT
        plan_type,
        amount,
        status,
        activated_at,
        cancelled_at,
        next_payment_date,
        grace_period_ends
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ hasSubscription: false });
    }

    const sub = result.rows[0];

    res.json({
      hasSubscription: true,
      plan: sub.plan_type,
      amount: sub.amount,
      status: sub.status,
      activatedAt: sub.activated_at,
      cancelledAt: sub.cancelled_at,
      nextPaymentDate: sub.next_payment_date,
      gracePeriodEnds: sub.grace_period_ends,
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

export default router;
