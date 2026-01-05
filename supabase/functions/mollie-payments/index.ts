import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        const response = await fetch(`${MOLLIE_API_URL}/methods?include=issuers`, {
          headers: {
            'Authorization': `Bearer ${mollieApiKey}`,
          },
        });

        if (!response.ok) {
          return new Response(JSON.stringify({ error: 'Failed to fetch methods' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await response.json();
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

        // Update subscription status if payment is successful
        if (payment.status === 'paid' && userId) {
          const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const adminClient = createClient(supabaseUrl, serviceRoleKey);

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
          .select('mollie_customer_id, mollie_subscription_id')
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

        return new Response(JSON.stringify({ success: true }), {
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
