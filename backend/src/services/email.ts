import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email sender configuration
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@perimenopauzeplan.nl';
const FROM_NAME = 'Perimenopauze Plan';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using Resend
 * GDPR Compliant: Only sends transactional emails (no marketing)
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  try {
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
      text: text || stripHtml(html),
    });

    console.log('Email sent successfully:', result.id);
    return true;

  } catch (error: any) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send welcome email after signup
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const subject = 'Welkom bij Perimenopauze Plan! 🌸';
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
        .button { display: inline-block; background: #9b87f5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welkom ${name}! 🌸</h1>
        </div>
        <div class="content">
          <p>Wat fijn dat je je hebt aangemeld bij Perimenopauze Plan!</p>

          <p>Met deze app kun je:</p>
          <ul>
            <li>📝 Dagboek bijhouden van symptomen en gevoelens</li>
            <li>📅 Je cyclus tracken en voorspellingen ontvangen</li>
            <li>🍽️ Voedingsadvies en recepten vinden</li>
            <li>💪 Beweegschema's volgen</li>
            <li>🤖 AI-chat voor vragen en ondersteuning</li>
          </ul>

          <a href="${process.env.FRONTEND_URL}" class="button">Start met plannen</a>

          <p>Heb je vragen? Stuur een email naar support@perimenopauzeplan.nl</p>
        </div>
        <div class="footer">
          <p>Deze email is verstuurd omdat je je hebt aangemeld op Perimenopauze Plan.</p>
          <p>Perimenopauze Plan - Privacy-first gezondheidstracking</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const subject = 'Wachtwoord resetten - Perimenopauze Plan';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
        .button { display: inline-block; background: #9b87f5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <h2>Wachtwoord resetten</h2>
          <p>Hoi ${name},</p>

          <p>Je hebt gevraagd om je wachtwoord te resetten. Klik op de knop hieronder om een nieuw wachtwoord in te stellen:</p>

          <a href="${resetUrl}" class="button">Reset wachtwoord</a>

          <div class="warning">
            ⚠️ Deze link is 1 uur geldig. Heb je deze email niet aangevraagd? Negeer deze email dan.
          </div>

          <p><small>Link werkt niet? Kopieer deze URL: ${resetUrl}</small></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Send premium subscription confirmation
 */
export async function sendSubscriptionConfirmationEmail(
  to: string,
  name: string,
  planName: string
): Promise<boolean> {
  const subject = `Je ${planName} abonnement is actief! ✨`;
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
        .features { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Gefeliciteerd ${name}! 🎉</h1>
        </div>
        <div class="content">
          <p>Je ${planName} abonnement is nu actief!</p>

          <div class="features">
            <h3>Je hebt nu toegang tot:</h3>
            <ul>
              <li>✨ Onbeperkte AI chat voor vragen</li>
              <li>📊 Geavanceerde statistieken en inzichten</li>
              <li>🍽️ Exclusieve recepten en voedingsplannen</li>
              <li>💪 Gepersonaliseerde trainingsschema's</li>
              <li>👥 Toegang tot de premium community</li>
              <li>📱 Offline modus (binnenkort!)</li>
            </ul>
          </div>

          <p><strong>Factuur:</strong> Je ontvangt je factuur apart via Mollie.</p>

          <p>Veel plezier met alle premium features!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedEmail(
  to: string,
  name: string
): Promise<boolean> {
  const subject = 'Betaling mislukt - Perimenopauze Plan';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
        .warning { background: #fee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f44; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <h2>Betaling mislukt</h2>
          <p>Hoi ${name},</p>

          <div class="warning">
            ⚠️ Je laatste betaling voor het premium abonnement is mislukt.
          </div>

          <p>Mogelijke oorzaken:</p>
          <ul>
            <li>Onvoldoende saldo</li>
            <li>Verlopen betaalmiddel</li>
            <li>Technisch probleem</li>
          </ul>

          <p>Je premium toegang blijft actief tot: <strong>${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('nl-NL')}</strong></p>

          <p>Update je betaalgegevens in de app onder Instellingen → Abonnement.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}

// Helper function to strip HTML tags for plain text version
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
