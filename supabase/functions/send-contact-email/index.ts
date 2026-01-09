import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ContactEmailRequest {
  type: 'contact' | 'feedback';
  name: string;
  email: string;
  message: string;
  subject?: string;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 requests per hour per IP

// In-memory rate limit store (resets on function cold start)
// For production, consider using a persistent store like Redis
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if the request is rate limited
 * Returns true if the request should be blocked
 */
function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(clientIp);

  if (!record) {
    // First request from this IP
    rateLimitStore.set(clientIp, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (now > record.resetTime) {
    // Window has expired, reset counter
    rateLimitStore.set(clientIp, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    // Rate limit exceeded
    return true;
  }

  // Increment counter
  record.count++;
  return false;
}

/**
 * Clean up expired entries from rate limit store
 * Called periodically to prevent memory leaks
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}

// Cleanup every 10 minutes
setInterval(cleanupRateLimitStore, 10 * 60 * 1000);

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    // Check rate limit
    if (isRateLimited(clientIp)) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          error: "Te veel verzoeken. Probeer het over een uur opnieuw.",
          retryAfter: 3600 
        }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json", 
            "Retry-After": "3600",
            ...corsHeaders 
          } 
        }
      );
    }

    const { type, name, email, message, subject }: ContactEmailRequest = await req.json();

    // Validate input
    if (!name || !email || !message || !type) {
      console.error("Missing required fields:", { name: !!name, email: !!email, message: !!message, type: !!type });
      return new Response(
        JSON.stringify({ error: "Alle velden zijn verplicht" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate type
    if (type !== 'contact' && type !== 'feedback') {
      console.error("Invalid type:", type);
      return new Response(
        JSON.stringify({ error: "Ongeldig berichttype" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Ongeldig e-mailadres" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate lengths
    if (name.length > 100 || email.length > 255 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Bericht te lang" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize inputs (basic HTML entity encoding)
    const sanitize = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const sanitizedName = sanitize(name);
    const sanitizedMessage = sanitize(message).replace(/\n/g, '<br>');

    const emailSubject = type === 'feedback' 
      ? `💡 Feedback/Suggestie - Perimenopauze Plan`
      : `📧 Contactbericht - Perimenopauze Plan`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h1 style="color: #85576D; margin: 0; font-size: 24px;">
            ${type === 'feedback' ? '💡 Nieuwe Feedback' : '📧 Nieuw Contactbericht'}
          </h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;"><strong>Van:</strong> ${sanitizedName}</p>
          <p style="margin: 0 0 10px 0;"><strong>E-mail:</strong> <a href="mailto:${email}">${email}</a></p>
          ${subject ? `<p style="margin: 0 0 10px 0;"><strong>Onderwerp:</strong> ${sanitize(subject)}</p>` : ''}
        </div>
        
        <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #374151;">Bericht:</h3>
          <p style="color: #4b5563; line-height: 1.6;">${sanitizedMessage}</p>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
          Verzonden via Perimenopauze Plan App
        </p>
      </div>
    `;

    console.log(`Sending ${type} email from ${email} (IP: ${clientIp})`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Perimenopauze Plan <onboarding@resend.dev>",
        to: ["healthymetheleen@gmail.com"],
        reply_to: email,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error("Email sending failed");
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: "Kon bericht niet versturen. Probeer het later opnieuw." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
