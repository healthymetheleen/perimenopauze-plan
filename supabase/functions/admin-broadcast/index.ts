import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, getAdminBroadcastEmail } from "../_shared/email-templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user auth
    const authHeader = req.headers.get('authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const jwt = authHeader?.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt!);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
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

    const { subject, message, targetAudience } = await req.json();

    if (!subject || !message) {
      return new Response(JSON.stringify({ error: 'Subject and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get target users based on audience
    const userQuery = adminClient.auth.admin.listUsers();
    
    // Note: For production, you'd want to paginate this
    const { data: usersData, error: usersError } = await userQuery;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let targetEmails: string[] = [];

    if (targetAudience === 'all') {
      targetEmails = usersData.users
        .filter(u => u.email)
        .map(u => u.email!);
    } else if (targetAudience === 'premium') {
      // Get premium user IDs
      const { data: premiumSubs } = await adminClient
        .from('subscriptions')
        .select('owner_id')
        .eq('status', 'active')
        .neq('plan', 'free');

      const premiumUserIds = new Set(premiumSubs?.map(s => s.owner_id) || []);
      targetEmails = usersData.users
        .filter(u => u.email && premiumUserIds.has(u.id))
        .map(u => u.email!);
    } else if (targetAudience === 'trial') {
      // Get users in trial
      const { data: trialSubs } = await adminClient
        .from('subscriptions')
        .select('owner_id')
        .eq('status', 'trialing');

      const trialUserIds = new Set(trialSubs?.map(s => s.owner_id) || []);
      targetEmails = usersData.users
        .filter(u => u.email && trialUserIds.has(u.id))
        .map(u => u.email!);
    } else if (targetAudience === 'free') {
      // Get free users (no active subscription)
      const { data: activeSubs } = await adminClient
        .from('subscriptions')
        .select('owner_id')
        .in('status', ['active', 'trialing']);

      const activeUserIds = new Set(activeSubs?.map(s => s.owner_id) || []);
      targetEmails = usersData.users
        .filter(u => u.email && !activeUserIds.has(u.id))
        .map(u => u.email!);
    }

    console.log(`Sending broadcast to ${targetEmails.length} users (audience: ${targetAudience})`);

    // Generate email content
    const emailData = getAdminBroadcastEmail(subject, message);

    // Send emails in batches (Resend has rate limits)
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 10;

    for (let i = 0; i < targetEmails.length; i += batchSize) {
      const batch = targetEmails.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (email) => {
        const success = await sendEmail(email, emailData.subject, emailData.html, resendApiKey);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      }));

      // Small delay between batches to respect rate limits
      if (i + batchSize < targetEmails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Broadcast complete: ${successCount} sent, ${errorCount} failed`);

    return new Response(JSON.stringify({ 
      success: true,
      sent: successCount,
      failed: errorCount,
      total: targetEmails.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in admin-broadcast:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
