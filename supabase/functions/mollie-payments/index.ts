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
    const body = req.method !== 'GET' ? await req.json() : {};

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
      const { data: { user: authUser } } = await supabase.auth.getUser();
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

        const { amount, description, redirectUrl, webhookUrl, metadata } = body;

        if (!amount || !description || !redirectUrl) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Creating Mollie payment for user ${user.id}: €${amount}`);

        const response = await fetch(`${MOLLIE_API_URL}/payments`, {
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
            redirectUrl,
            webhookUrl: webhookUrl || `${supabaseUrl}/functions/v1/mollie-payments/webhook`,
            metadata: {
              ...metadata,
              user_id: user.id,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Mollie API error:', response.status, errorText);
          return new Response(JSON.stringify({ error: 'Failed to create payment' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const payment = await response.json();
        console.log(`Payment created: ${payment.id}`);

        return new Response(JSON.stringify({
          id: payment.id,
          checkoutUrl: payment._links.checkout.href,
          status: payment.status,
        }), {
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
          const errorText = await response.text();
          console.error('Mollie API error:', response.status, errorText);
          return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
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
          const errorText = await response.text();
          console.error('Mollie API error:', response.status, errorText);
          return new Response(JSON.stringify({ error: 'Failed to create customer' }), {
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

        console.log(`Payment ${paymentId} status: ${payment.status}`);

        // Update subscription status if payment is successful
        if (payment.status === 'paid' && userId) {
          const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const adminClient = createClient(supabaseUrl, serviceRoleKey);

          // Update or create subscription
          const { error } = await adminClient
            .from('subscriptions')
            .upsert({
              owner_id: userId,
              plan: payment.metadata?.plan || 'premium',
              status: 'active',
            }, {
              onConflict: 'owner_id'
            });

          if (error) {
            console.error('Failed to update subscription:', error);
          } else {
            console.log(`Subscription activated for user ${userId}`);
          }

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

        const { customerId, subscriptionId } = body;

        if (!customerId || !subscriptionId) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Cancelling subscription ${subscriptionId}`);

        const response = await fetch(
          `${MOLLIE_API_URL}/customers/${customerId}/subscriptions/${subscriptionId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${mollieApiKey}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Mollie API error:', response.status, errorText);
          return new Response(JSON.stringify({ error: 'Failed to cancel subscription' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update subscription in database
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('owner_id', user.id);

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
