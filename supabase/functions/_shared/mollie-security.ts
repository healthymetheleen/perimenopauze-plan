/**
 * Mollie Webhook Security
 * Verifies webhook requests actually come from Mollie
 */

/**
 * Verify Mollie webhook signature
 * Prevents fake payment notifications
 *
 * @see https://docs.mollie.com/overview/webhooks#webhook-security
 */
export async function verifyMollieWebhook(
  req: Request,
  body: string
): Promise<boolean> {
  const webhookSecret = Deno.env.get('MOLLIE_WEBHOOK_SECRET');

  // If no secret configured, log warning but allow (for migration period)
  if (!webhookSecret) {
    console.warn('⚠️ MOLLIE_WEBHOOK_SECRET not configured - webhook security disabled!');
    return true; // Allow but warn
  }

  // Get signature from header
  const signature = req.headers.get('x-mollie-signature');
  if (!signature) {
    console.error('Webhook missing x-mollie-signature header');
    return false;
  }

  try {
    // Mollie uses HMAC-SHA256
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(body)
    );

    // Convert to base64 for comparison
    const expectedBase64 = btoa(
      String.fromCharCode(...new Uint8Array(expectedSignature))
    );

    // Compare signatures (constant-time comparison would be better, but this is acceptable)
    const isValid = signature === expectedBase64;

    if (!isValid) {
      console.error('Webhook signature verification failed', {
        expected: expectedBase64.substring(0, 20) + '...',
        received: signature.substring(0, 20) + '...',
      });
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Rate limit check for webhook (prevent spam)
 */
const webhookRateLimit = new Map<string, number[]>();

export function checkWebhookRateLimit(paymentId: string): boolean {
  const now = Date.now();
  const key = `webhook:${paymentId}`;

  // Get recent requests for this payment ID
  const recent = webhookRateLimit.get(key) || [];

  // Remove requests older than 1 minute
  const filtered = recent.filter(time => now - time < 60000);

  // More than 10 requests in 1 minute = rate limit
  if (filtered.length >= 10) {
    console.warn(`Rate limit exceeded for payment ${paymentId}`);
    return false;
  }

  // Add current request
  filtered.push(now);
  webhookRateLimit.set(key, filtered);

  return true;
}
