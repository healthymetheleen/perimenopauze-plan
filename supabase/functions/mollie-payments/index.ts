import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  sendEmail,
  getSubscriptionWelcomeEmail,
  getSubscriptionCancelledEmail,
  getPaymentFailedEmail,
  getRefundProcessedEmail,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MOLLIE_API_URL = 'https://api.mollie.com/v2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mollieApiKey = Deno.env.get('MOLLIE_API_KEY');
    if (!mollieApiKey) {
      console.error('Mollie API key not configured');
      return new Response(JSON.stringify({ error: 'Payment service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {};

    // Create Supabase client for auth
    const authHeader = req.headers.get('authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // Verify user for protected endpoints
    let user = null;
    if (authHeader) {
      const jwt = authHeader.replace(/^Bearer\s+/i, '');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(jwt);
      if (authError) {
        console.log('Auth error:', authError.message);
      }
      user = authUser;
    }

    // Route handling
    switch (path) {
      case 'create-payment': {
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { amount, description, redirectUrl, webhookUrl, metadata, method } = body;

        if (!amount || !description || !redirectUrl) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Creating Mollie payment for user ${user.id}: €${amount} (method: ${method || 'any'})`);

        const paymentBody: Record<string, unknown> = {
          amount: {
            currency: 'EUR',
            value: amount.toFixed(2),
          },
          description,
          redirectUrl,
          webhookUrl: webhookUrl || `${supabaseUrl}/functions/v1/mollie-payments/webhook`,
          metadata: {
            ...metadata,
            user_id: user.id,
          },
        };

        // Add specific payment method if requested (e.g., 'ideal')
        if (method) {
          paymentBody.method = method;
        }

        const response = await fetch(`${MOLLIE_API_URL}/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentBody),
        });

        if (!response.ok) {
          // Log only status code, not full error response (security)
          console.error('Mollie API error:', { status: response.status, endpoint: 'create-payment' });
          return new Response(JSON.stringify({ error: 'Betaling kon niet worden aangemaakt. Probeer het opnieuw.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const payment = await response.json();
        console.log(`Payment created: ${payment.id}`);

        return new Response(JSON.stringify({
          id: payment.id,
          checkoutUrl: payment._links.checkout?.href || payment._links.dashboard?.href,
          status: payment.status,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-methods': {
        // Get available payment methods
        console.log('Fetching Mollie payment methods...');
        const response = await fetch(`${MOLLIE_API_URL}/methods?include=issuers`, {
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Mollie get-methods error:', { status: response.status, error: errorText });
          return new Response(JSON.stringify({ error: 'Failed to fetch methods', details: response.status }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await response.json();
        console.log('Mollie methods fetched successfully:', data._embedded?.methods?.length || 0, 'methods');
        const methods = data._embedded?.methods?.map((m: any) => ({
          id: m.id,
          description: m.description,
          image: m.image?.svg,
          issuers: m.issuers?._embedded?.issuers || [],
        })) || [];

        return new Response(JSON.stringify({ methods }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create-first-payment': {
        // Create a "first" payment that establishes a mandate for recurring payments
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { amount, description, redirectUrl, webhookUrl, metadata, method, issuer } = body;

        if (!amount || !description || !redirectUrl) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // First, create or get customer
        console.log(`Creating customer for first payment, user ${user.id}`);
        
        const customerResponse = await fetch(`${MOLLIE_API_URL}/customers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            metadata: { user_id: user.id },
          }),
        });

        if (!customerResponse.ok) {
          // Log only status code, not full error response (security)
          console.error('Mollie API error:', { status: customerResponse.status, endpoint: 'create-customer-for-first-payment' });
          return new Response(JSON.stringify({ error: 'Klant kon niet worden aangemaakt. Probeer het opnieuw.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const customer = await customerResponse.json();
        console.log(`Customer created: ${customer.id}`);

        // Create first payment with sequenceType to establish mandate
        const paymentBody: Record<string, unknown> = {
          amount: {
            currency: 'EUR',
            value: amount.toFixed(2),
          },
          description,
          redirectUrl,
          webhookUrl: webhookUrl || `${supabaseUrl}/functions/v1/mollie-payments/webhook`,
          customerId: customer.id,
          sequenceType: 'first', // Important: establishes mandate for recurring
          metadata: {
            ...metadata,
            user_id: user.id,
            customer_id: customer.id,
            is_first_payment: true,
          },
        };

        // Add specific payment method if requested
        if (method) {
          paymentBody.method = method;
        }
        if (issuer) {
          paymentBody.issuer = issuer;
        }

        console.log(`Creating first payment for recurring: €${amount}`);

        const response = await fetch(`${MOLLIE_API_URL}/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentBody),
        });

        if (!response.ok) {
          // Log only status code, not full error response (security)
          console.error('Mollie API error:', { status: response.status, endpoint: 'create-first-payment' });
          return new Response(JSON.stringify({ error: 'Eerste betaling kon niet worden aangemaakt. Probeer het opnieuw.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const payment = await response.json();
        console.log(`First payment created: ${payment.id}, customer: ${customer.id}`);

        return new Response(JSON.stringify({
          id: payment.id,
          customerId: customer.id,
          checkoutUrl: payment._links.checkout?.href,
          status: payment.status,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create-ideal-payment': {
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { amount, description, redirectUrl, webhookUrl, metadata, issuer } = body;

        if (!amount || !description || !redirectUrl) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Creating iDEAL payment for user ${user.id}: €${amount}`);

        const paymentBody: Record<string, unknown> = {
          amount: {
            currency: 'EUR',
            value: amount.toFixed(2),
          },
          description,
          redirectUrl,
          webhookUrl: webhookUrl || `${supabaseUrl}/functions/v1/mollie-payments/webhook`,
          method: 'ideal',
          metadata: {
            ...metadata,
            user_id: user.id,
          },
        };

        // Add specific bank issuer if selected
        if (issuer) {
          paymentBody.issuer = issuer;
        }

        const response = await fetch(`${MOLLIE_API_URL}/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentBody),
        });

        if (!response.ok) {
          // Log only status code, not full error response (security)
          console.error('Mollie API error:', { status: response.status, endpoint: 'create-ideal-payment' });
          return new Response(JSON.stringify({ error: 'iDEAL betaling kon niet worden aangemaakt. Probeer het opnieuw.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const payment = await response.json();
        console.log(`iDEAL payment created: ${payment.id}`);

        return new Response(JSON.stringify({
          id: payment.id,
          checkoutUrl: payment._links.checkout?.href,
          status: payment.status,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-ideal-issuers': {
        // Get iDEAL bank issuers
        const response = await fetch(`${MOLLIE_API_URL}/methods/ideal?include=issuers`, {
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
          },
        });

        if (!response.ok) {
          return new Response(JSON.stringify({ error: 'Failed to fetch iDEAL issuers' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await response.json();
        const issuers = data.issuers?._embedded?.issuers?.map((i: any) => ({
          id: i.id,
          name: i.name,
          image: i.image?.svg,
        })) || [];

        return new Response(JSON.stringify({ issuers }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-subscription': {
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get subscription from database
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        return new Response(JSON.stringify({ subscription: subscription || null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create-subscription': {
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { customerId, amount, description, interval, webhookUrl } = body;

        if (!customerId || !amount || !description || !interval) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Creating Mollie subscription for customer ${customerId}`);

        const response = await fetch(`${MOLLIE_API_URL}/customers/${customerId}/subscriptions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: {
              currency: 'EUR',
              value: amount.toFixed(2),
            },
            description,
            interval, // e.g., '1 month', '1 year'
            webhookUrl: webhookUrl || `${supabaseUrl}/functions/v1/mollie-payments/webhook`,
            metadata: {
              user_id: user.id,
            },
          }),
        });

        if (!response.ok) {
          // Log only status code, not full error response (security)
          console.error('Mollie API error:', { status: response.status, endpoint: 'create-subscription' });
          return new Response(JSON.stringify({ error: 'Abonnement kon niet worden aangemaakt. Probeer het opnieuw.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const subscription = await response.json();
        console.log(`Subscription created: ${subscription.id}`);

        return new Response(JSON.stringify({
          id: subscription.id,
          status: subscription.status,
          nextPaymentDate: subscription.nextPaymentDate,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create-customer': {
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { name, email } = body;

        console.log(`Creating Mollie customer for user ${user.id}`);

        const response = await fetch(`${MOLLIE_API_URL}/customers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name || 'Customer',
            email: email || user.email,
            metadata: {
              user_id: user.id,
            },
          }),
        });

        if (!response.ok) {
          // Log only status code, not full error response (security)
          console.error('Mollie API error:', { status: response.status, endpoint: 'create-customer' });
          return new Response(JSON.stringify({ error: 'Klant kon niet worden aangemaakt. Probeer het opnieuw.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const customer = await response.json();
        console.log(`Customer created: ${customer.id}`);

        return new Response(JSON.stringify({
          id: customer.id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-payment': {
        const paymentId = url.searchParams.get('id');
        
        if (!paymentId) {
          return new Response(JSON.stringify({ error: 'Payment ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const response = await fetch(`${MOLLIE_API_URL}/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
          },
        });

        if (!response.ok) {
          return new Response(JSON.stringify({ error: 'Payment not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const payment = await response.json();

        return new Response(JSON.stringify({
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          paidAt: payment.paidAt,
          metadata: payment.metadata,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'webhook': {
        // Mollie sends payment ID in form data
        const formData = await req.formData();
        const paymentId = formData.get('id');

        if (!paymentId) {
          return new Response('OK', { status: 200 });
        }

        console.log(`Webhook received for payment: ${paymentId}`);

        // Fetch payment details
        const response = await fetch(`${MOLLIE_API_URL}/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch payment:', paymentId);
          return new Response('OK', { status: 200 });
        }

        const payment = await response.json();
        const userId = payment.metadata?.user_id;
        const customerId = payment.metadata?.customer_id;
        const isFirstPayment = payment.metadata?.is_first_payment;
        const plan = payment.metadata?.plan;

        console.log(`Payment ${paymentId} status: ${payment.status}, isFirst: ${isFirstPayment}`);

        // Handle failed payments
        if (payment.status === 'failed' && userId) {
          console.log(`Payment failed for user ${userId}`);
          const resendApiKey = Deno.env.get('RESEND_API_KEY');
          if (resendApiKey && payment.metadata?.email) {
            const emailData = getPaymentFailedEmail('', payment.amount?.value || '7.50');
            await sendEmail(payment.metadata.email, emailData.subject, emailData.html, resendApiKey);
          }
        }

        // Update subscription status if payment is successful
        if (payment.status === 'paid' && userId) {
          const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const adminClient = createClient(supabaseUrl, serviceRoleKey);
          const resendApiKey = Deno.env.get('RESEND_API_KEY');

          // Get user email for notifications
          const { data: userData } = await adminClient.auth.admin.getUserById(userId);
          const userEmail = userData?.user?.email;

          // If this is a first payment, create recurring subscription
          if (isFirstPayment && customerId) {
            console.log(`Creating recurring subscription for customer ${customerId}`);
            
            // Calculate start date (7 days from now for trial, or immediately)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 7); // 7-day trial
            
            const subscriptionResponse = await fetch(
              `${MOLLIE_API_URL}/customers/${customerId}/subscriptions`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${mollieApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  amount: {
                    currency: 'EUR',
                    value: '7.50',
                  },
                  interval: '1 month',
                  description: 'Perimenopauze Plan App - Maandelijks',
                  startDate: startDate.toISOString().split('T')[0],
                  webhookUrl: `${supabaseUrl}/functions/v1/mollie-payments/webhook`,
                  metadata: {
                    user_id: userId,
                  },
                }),
              }
            );

            if (subscriptionResponse.ok) {
              const mollieSubscription = await subscriptionResponse.json();
              console.log(`Recurring subscription created: ${mollieSubscription.id}`);
              
              // Calculate trial end date (7 days from now)
              const trialEndsAt = new Date();
              trialEndsAt.setDate(trialEndsAt.getDate() + 7);
              
              // Store subscription with Mollie IDs in database
              await adminClient
                .from('subscriptions')
                .upsert({
                  owner_id: userId,
                  plan: 'premium_monthly',
                  status: 'active',
                  mollie_customer_id: customerId,
                  mollie_subscription_id: mollieSubscription.id,
                  trial_ends_at: trialEndsAt.toISOString(),
                }, {
                  onConflict: 'owner_id'
                });

              // Send welcome email
              if (resendApiKey && userEmail) {
                const emailData = getSubscriptionWelcomeEmail('');
                await sendEmail(userEmail, emailData.subject, emailData.html, resendApiKey);
                console.log(`Welcome email sent to ${userEmail}`);
              }
            } else {
              // Log only status code, not full error response (security)
              console.error('Mollie API error:', { status: subscriptionResponse.status, endpoint: 'create-recurring-subscription-webhook' });
            }
          } else {
            // Regular recurring payment
            await adminClient
              .from('subscriptions')
              .upsert({
                owner_id: userId,
                plan: plan || 'premium',
                status: 'active',
              }, {
                onConflict: 'owner_id'
              });
          }

          console.log(`Subscription activated for user ${userId}`);

          // Update entitlements
          await adminClient
            .from('entitlements')
            .upsert({
              owner_id: userId,
              can_use_trends: true,
              can_use_patterns: true,
              can_export: true,
            }, {
              onConflict: 'owner_id'
            });
        }

        return new Response('OK', { status: 200 });
      }

      case 'cancel-subscription': {
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get Mollie IDs from database instead of requiring them from client
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('mollie_customer_id, mollie_subscription_id, current_period_ends_at')
          .eq('owner_id', user.id)
          .single();

        if (!subData?.mollie_customer_id || !subData?.mollie_subscription_id) {
          // No Mollie subscription to cancel, just update local status
          console.log('No Mollie subscription found, updating local status only');
          await supabase
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('owner_id', user.id);

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Cancelling Mollie subscription ${subData.mollie_subscription_id}`);

        const response = await fetch(
          `${MOLLIE_API_URL}/customers/${subData.mollie_customer_id}/subscriptions/${subData.mollie_subscription_id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${mollieApiKey}`,
            },
          }
        );

        if (!response.ok) {
          // Log only status code, not full error response (security)
          console.error('Mollie API error:', { status: response.status, endpoint: 'cancel-subscription' });
          return new Response(JSON.stringify({ error: 'Abonnement kon niet worden geannuleerd. Probeer het opnieuw.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update subscription in database
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('owner_id', user.id);

        console.log(`Subscription cancelled for user ${user.id}`);

        // Send cancellation email
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey && user.email) {
          const accessUntil = subData.current_period_ends_at 
            ? new Date(subData.current_period_ends_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
            : '';
          const emailData = getSubscriptionCancelledEmail('', accessUntil);
          await sendEmail(user.email, emailData.subject, emailData.html, resendApiKey);
          console.log(`Cancellation email sent to ${user.email}`);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'request-refund': {
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { reason, reasonDetails } = body;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        if (!reason) {
          return new Response(JSON.stringify({ error: 'Reden is verplicht' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get subscription info
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('mollie_customer_id, mollie_subscription_id, created_at')
          .eq('owner_id', user.id)
          .single();

        if (!subData) {
          return new Response(JSON.stringify({ error: 'Geen actief abonnement gevonden' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if within 14-day refund window (EU consumer rights)
        const createdAt = subData?.created_at ? new Date(subData.created_at) : null;
        const daysSinceStart = createdAt 
          ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceStart > 14) {
          return new Response(JSON.stringify({ 
            error: 'Refund niet mogelijk. De 14-daagse bedenktijd is verstreken.',
            eligible: false,
            daysSinceStart
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // ABUSE PREVENTION: Check for existing pending/processing refund requests
        const { data: existingPending } = await adminClient
          .from('refund_requests')
          .select('id')
          .eq('owner_id', user.id)
          .in('status', ['pending', 'processing'])
          .limit(1);

        if (existingPending && existingPending.length > 0) {
          return new Response(JSON.stringify({ 
            error: 'Je hebt al een lopende refund aanvraag. Wacht tot deze is verwerkt.',
            existingRequest: true
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // ABUSE PREVENTION: Max 1 refund per 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: recentRefunds } = await adminClient
          .from('refund_requests')
          .select('id, created_at')
          .eq('owner_id', user.id)
          .eq('status', 'refunded')
          .gte('created_at', sixMonthsAgo.toISOString());

        if (recentRefunds && recentRefunds.length > 0) {
          const lastRefund = new Date(recentRefunds[0].created_at);
          const nextEligible = new Date(lastRefund);
          nextEligible.setMonth(nextEligible.getMonth() + 6);
          
          return new Response(JSON.stringify({ 
            error: `Je hebt al een refund ontvangen. Nieuwe aanvraag mogelijk vanaf ${nextEligible.toLocaleDateString('nl-NL')}.`,
            rateLimited: true,
            nextEligibleDate: nextEligible.toISOString()
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create refund request in database
        const amountCents = 750; // €7.50
        const { data: refundRequest, error: insertError } = await adminClient
          .from('refund_requests')
          .insert({
            owner_id: user.id,
            amount_cents: amountCents,
            reason,
            reason_details: reasonDetails || null,
            status: 'pending',
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create refund request:', insertError);
          return new Response(JSON.stringify({ error: 'Kon refund aanvraag niet aanmaken' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Log to audit table
        await adminClient.from('audit_logs').insert({
          actor_id: user.id,
          action: 'refund_requested',
          target_type: 'refund_request',
          target_id: refundRequest.id,
          metadata: {
            reason,
            reason_details: reasonDetails,
            days_since_start: daysSinceStart,
            amount_cents: amountCents,
          },
        });

        // Send notification email to admin
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Perimenopauze Plan <onboarding@resend.dev>",
              to: ["healthymetheleen@gmail.com"],
              subject: "🔄 Nieuwe refund aanvraag - Perimenopauze Plan",
              html: `
                <h2>Nieuwe refund aanvraag</h2>
                <table style="border-collapse: collapse; width: 100%;">
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Aanvraag ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${refundRequest.id}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Gebruiker</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${user.email}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>User ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${user.id}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Bedrag</strong></td><td style="padding: 8px; border: 1px solid #ddd;">€${(amountCents / 100).toFixed(2)}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Abonnement gestart</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${createdAt?.toLocaleDateString('nl-NL') || 'Onbekend'}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Dagen sinds start</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${daysSinceStart}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Mollie Customer ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${subData?.mollie_customer_id || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reden</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${reason}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Toelichting</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${reasonDetails || '-'}</td></tr>
                </table>
                <p style="margin-top: 20px;">
                  <a href="https://my.mollie.com" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Open Mollie Dashboard</a>
                </p>
              `,
            }),
          });
        }

        // Send confirmation email to user
        if (resendApiKey && user.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Perimenopauze Plan <onboarding@resend.dev>",
              to: [user.email],
              subject: "Je refund aanvraag is ontvangen",
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="text-align: center; padding: 20px;">
                    <img src="https://healthymetheleen.nl/pwa-icon.svg" alt="Perimenopauze Plan" width="60" height="60" />
                  </div>
                  <h2 style="color: #1f2937;">We hebben je aanvraag ontvangen</h2>
                  <p>Beste gebruiker,</p>
                  <p>We hebben je refund aanvraag ontvangen en gaan deze zo snel mogelijk behandelen.</p>
                  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Aanvraag ID:</strong> ${refundRequest.id.slice(0, 8)}...</p>
                    <p style="margin: 8px 0 0;"><strong>Bedrag:</strong> €${(amountCents / 100).toFixed(2)}</p>
                    <p style="margin: 8px 0 0;"><strong>Status:</strong> In behandeling</p>
                  </div>
                  <p>We streven ernaar je aanvraag binnen 2 werkdagen te verwerken. Je ontvangt een e-mail zodra de refund is verwerkt.</p>
                  <p style="color: #6b7280; font-size: 14px;">Afhankelijk van je bank kan het 5-10 werkdagen duren voordat het bedrag op je rekening staat.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="color: #6b7280; font-size: 12px;">
                    Vragen? Neem contact op via het contactformulier in de app.
                  </p>
                </div>
              `,
            }),
          });
        }

        console.log(`Refund request ${refundRequest.id} created for user ${user.id}`);

        return new Response(JSON.stringify({ 
          success: true, 
          requestId: refundRequest.id,
          status: 'pending',
          message: 'Je refund aanvraag is ontvangen. We nemen binnen 2 werkdagen contact op.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-refund-status': {
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get user's refund requests
        const { data: refundRequests } = await supabase
          .from('refund_requests')
          .select('id, status, reason, created_at, processed_at, amount_cents')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        // Check eligibility for new request
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('created_at')
          .eq('owner_id', user.id)
          .single();

        const createdAt = subData?.created_at ? new Date(subData.created_at) : null;
        const daysSinceStart = createdAt 
          ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const isWithinWindow = daysSinceStart <= 14;
        const hasPendingRequest = refundRequests?.some(r => r.status === 'pending' || r.status === 'processing');

        // Check rate limit (1 per 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const hasRecentRefund = refundRequests?.some(
          r => r.status === 'refunded' && new Date(r.created_at) > sixMonthsAgo
        );

        return new Response(JSON.stringify({
          requests: refundRequests || [],
          eligibility: {
            canRequest: isWithinWindow && !hasPendingRequest && !hasRecentRefund && !!subData,
            isWithinWindow,
            hasPendingRequest,
            hasRecentRefund,
            daysSinceStart,
            daysRemaining: Math.max(0, 14 - daysSinceStart),
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'process-refund': {
        // Admin-only endpoint to process refunds
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if admin
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        
        const { data: roleData } = await adminClient
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (!roleData) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { requestId, paymentId, amount, approve, adminNotes } = body;

        if (!requestId) {
          return new Response(JSON.stringify({ error: 'Missing required field: requestId' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get refund request
        const { data: refundRequest } = await adminClient
          .from('refund_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (!refundRequest) {
          return new Response(JSON.stringify({ error: 'Refund aanvraag niet gevonden' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const targetUserId = refundRequest.owner_id;
        const refundAmount = amount || (refundRequest.amount_cents / 100);

        // If rejecting
        if (approve === false) {
          await adminClient
            .from('refund_requests')
            .update({ 
              status: 'rejected',
              admin_notes: adminNotes,
              processed_by: user.id,
              processed_at: new Date().toISOString(),
            })
            .eq('id', requestId);

          // Audit log
          await adminClient.from('audit_logs').insert({
            actor_id: user.id,
            action: 'refund_rejected',
            target_type: 'refund_request',
            target_id: requestId,
            metadata: { admin_notes: adminNotes, target_user_id: targetUserId },
          });

          console.log(`Refund request ${requestId} rejected by admin ${user.id}`);

          return new Response(JSON.stringify({ success: true, status: 'rejected' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Processing/approving - need paymentId
        if (!paymentId) {
          return new Response(JSON.stringify({ error: 'Missing paymentId for refund processing' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update status to processing
        await adminClient
          .from('refund_requests')
          .update({ status: 'processing', processed_by: user.id })
          .eq('id', requestId);

        // Create refund via Mollie
        const refundResponse = await fetch(`${MOLLIE_API_URL}/payments/${paymentId}/refunds`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: {
              currency: 'EUR',
              value: refundAmount.toFixed(2),
            },
          }),
        });

        if (!refundResponse.ok) {
          console.error('Mollie refund error:', refundResponse.status);
          // Revert status
          await adminClient
            .from('refund_requests')
            .update({ status: 'pending', admin_notes: 'Mollie refund mislukt' })
            .eq('id', requestId);

          return new Response(JSON.stringify({ error: 'Refund kon niet worden verwerkt bij Mollie' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const refund = await refundResponse.json();
        console.log(`Refund created: ${refund.id}`);

        // Update refund request status
        await adminClient
          .from('refund_requests')
          .update({ 
            status: 'refunded',
            mollie_refund_id: refund.id,
            admin_notes: adminNotes,
            processed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        // Update subscription status
        await adminClient
          .from('subscriptions')
          .update({ status: 'refunded', plan: 'free' })
          .eq('owner_id', targetUserId);

        // Audit log
        await adminClient.from('audit_logs').insert({
          actor_id: user.id,
          action: 'refund_processed',
          target_type: 'refund_request',
          target_id: requestId,
          metadata: { 
            mollie_refund_id: refund.id, 
            amount: refundAmount,
            target_user_id: targetUserId,
            payment_id: paymentId,
          },
        });

        // Send refund confirmation email
        const { data: targetUser } = await adminClient.auth.admin.getUserById(targetUserId);
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        
        if (resendApiKey && targetUser?.user?.email) {
          const emailData = getRefundProcessedEmail('', refundAmount.toFixed(2));
          await sendEmail(targetUser.user.email, emailData.subject, emailData.html, resendApiKey);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          refundId: refund.id,
          status: refund.status 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-payment-history': {
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get Mollie customer ID from database
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('mollie_customer_id')
          .eq('owner_id', user.id)
          .single();

        if (!subData?.mollie_customer_id) {
          return new Response(JSON.stringify({ payments: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch payments from Mollie for this customer
        const response = await fetch(
          `${MOLLIE_API_URL}/customers/${subData.mollie_customer_id}/payments?limit=50`,
          {
            headers: {
              'Authorization': `Bearer ${mollieApiKey}`,
            },
          }
        );

        if (!response.ok) {
          console.error('Mollie API error:', { status: response.status, endpoint: 'get-customer-payments' });
          return new Response(JSON.stringify({ payments: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await response.json();
        const payments = (data._embedded?.payments || [])
          .filter((p: any) => p.status === 'paid')
          .map((p: any) => ({
            id: p.id,
            amount: p.amount.value,
            currency: p.amount.currency,
            description: p.description,
            status: p.status,
            paidAt: p.paidAt,
            method: p.method,
            // Generate a simple invoice reference
            invoiceRef: `INV-${p.id.replace('tr_', '').toUpperCase()}`,
          }));

        return new Response(JSON.stringify({ payments }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown endpoint' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in mollie-payments:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
