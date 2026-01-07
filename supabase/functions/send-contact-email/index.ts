import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  type: 'contact' | 'feedback';
  name: string;
  email: string;
  message: string;
  subject?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, name, email, message, subject }: ContactEmailRequest = await req.json();

    // Validate input
    if (!name || !email || !message || !type) {
      console.error("Missing required fields:", { name, email, message, type });
      return new Response(
        JSON.stringify({ error: "Alle velden zijn verplicht" }),
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

    console.log(`Sending ${type} email from ${email}`);

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
  } catch (error: any) {
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
