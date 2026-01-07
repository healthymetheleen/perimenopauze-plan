// Branded email templates for Perimenopauze Plan
// Colors based on the app's design system

const BRAND_COLORS = {
  primary: '#C4849B',       // HSL 324 38% 58% - dusty rose
  secondary: '#85576D',     // HSL 336 32% 38% - deeper mauve
  background: '#FBF4F1',    // HSL 17 50% 97% - warm cream
  accent: '#7BA356',        // HSL 95 35% 50% - fresh green
  text: '#4A2D3A',          // HSL 340 30% 20% - dark text
  muted: '#6B4D5A',         // muted text
  border: '#E8DDD8',        // light border
};

const LOGO_URL = 'https://rfvvpfvrxxodslzdqgll.supabase.co/storage/v1/object/public/content-images/logo.png';

export function getEmailWrapper(content: string, preheader: string = ''): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Perimenopauze Plan</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: ${BRAND_COLORS.background}; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, ${BRAND_COLORS.background} 0%, #FCE7F3 100%); padding: 32px 24px; text-align: center; }
    .logo { width: 180px; height: auto; }
    .content { padding: 32px 24px; color: ${BRAND_COLORS.text}; }
    .footer { background-color: ${BRAND_COLORS.background}; padding: 24px; text-align: center; color: ${BRAND_COLORS.muted}; font-size: 12px; }
    .button { display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; }
    .highlight-box { background-color: ${BRAND_COLORS.background}; border-left: 4px solid ${BRAND_COLORS.primary}; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .success-box { background-color: #F0F7EC; border-left: 4px solid ${BRAND_COLORS.accent}; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    h1 { color: ${BRAND_COLORS.secondary}; margin: 0 0 16px 0; font-size: 24px; font-weight: 600; }
    h2 { color: ${BRAND_COLORS.secondary}; margin: 24px 0 12px 0; font-size: 18px; font-weight: 600; }
    p { line-height: 1.6; margin: 0 0 16px 0; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; line-height: 1.5; }
    a { color: ${BRAND_COLORS.primary}; }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="Perimenopauze Plan" class="logo" onerror="this.style.display='none'">
      <h1 style="margin-top: 16px; color: ${BRAND_COLORS.secondary};">Perimenopauze Plan</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">Perimenopauze Plan App</p>
      <p style="margin: 0 0 8px 0;">Speciaal voor vrouwen in de perimenopauze</p>
      <p style="margin: 0; font-size: 11px; color: #999;">
        Je ontvangt deze e-mail omdat je een account hebt bij Perimenopauze Plan.<br>
        <a href="mailto:healthymetheleen@gmail.com" style="color: ${BRAND_COLORS.muted};">Contact opnemen</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function getSubscriptionWelcomeEmail(userName: string): { subject: string; html: string } {
  const content = `
    <h1>Welkom bij Premium! 🎉</h1>
    <p>Hoi${userName ? ` ${userName}` : ''},</p>
    <p>Wat fijn dat je voor Premium hebt gekozen! Je hebt nu toegang tot alle functies van Perimenopauze Plan.</p>
    
    <div class="success-box">
      <strong>Je 7-daagse gratis proefperiode is gestart!</strong><br>
      Na de proefperiode wordt automatisch €7,50 per maand afgeschreven.
    </div>
    
    <h2>Dit kun je nu doen:</h2>
    <ul>
      <li>🍽️ <strong>AI Maaltijdanalyses</strong> - Foto's van je maaltijden analyseren</li>
      <li>💡 <strong>Dagelijkse Inzichten</strong> - Gepersonaliseerde tips op basis van je data</li>
      <li>📊 <strong>Trends & Patronen</strong> - Ontdek verbanden in je cyclus en leefstijl</li>
      <li>🧘 <strong>Bewegingsoefeningen</strong> - Afgestemd op je cyclusfase</li>
      <li>📈 <strong>Maandelijkse Analyse</strong> - Uitgebreide maandrapportages</li>
    </ul>
    
    <p style="text-align: center; margin-top: 32px;">
      <a href="https://perimenopauzeplan.lovable.app/dashboard" class="button">
        Open de app
      </a>
    </p>
    
    <div class="highlight-box">
      <strong>Tip:</strong> Log dagelijks je maaltijden, slaap en symptomen voor de beste inzichten!
    </div>
    
    <p>Heb je vragen? Stuur gerust een bericht via de app of reply op deze e-mail.</p>
    <p>Hartelijke groet,<br>Team Perimenopauze Plan</p>
  `;
  
  return {
    subject: '🎉 Welkom bij Perimenopauze Plan Premium!',
    html: getEmailWrapper(content, 'Je Premium abonnement is geactiveerd. Ontdek alle functies!')
  };
}

export function getSubscriptionCancelledEmail(userName: string, accessUntil: string): { subject: string; html: string } {
  const content = `
    <h1>Je abonnement is opgezegd</h1>
    <p>Hoi${userName ? ` ${userName}` : ''},</p>
    <p>We hebben je opzegging ontvangen. Jammer dat je weggaat!</p>
    
    <div class="highlight-box">
      <strong>Goed om te weten:</strong><br>
      Je hebt nog toegang tot alle Premium functies tot het einde van je huidige periode${accessUntil ? ` (${accessUntil})` : ''}.
    </div>
    
    <p>Na deze datum:</p>
    <ul>
      <li>Kun je geen nieuwe maaltijden of symptomen meer loggen</li>
      <li>Blijven je bestaande gegevens 30 dagen bewaard</li>
      <li>Kun je altijd opnieuw abonneren om verder te gaan</li>
    </ul>
    
    <p>Mogen we vragen waarom je opzegt? Je feedback helpt ons de app te verbeteren. Reply gerust op deze e-mail.</p>
    
    <p style="text-align: center; margin-top: 32px;">
      <a href="https://perimenopauzeplan.lovable.app/subscription" class="button">
        Toch Premium blijven
      </a>
    </p>
    
    <p>We hopen je snel weer te zien!</p>
    <p>Hartelijke groet,<br>Team Perimenopauze Plan</p>
  `;
  
  return {
    subject: 'Je Perimenopauze Plan abonnement is opgezegd',
    html: getEmailWrapper(content, 'Je opzegging is bevestigd. Je houdt nog toegang tot het einde van je periode.')
  };
}

export function getPaymentFailedEmail(userName: string, amount: string): { subject: string; html: string } {
  const content = `
    <h1>Betaling niet gelukt</h1>
    <p>Hoi${userName ? ` ${userName}` : ''},</p>
    <p>Helaas is je maandelijkse betaling van <strong>€${amount}</strong> niet gelukt.</p>
    
    <div class="highlight-box" style="border-left-color: #E53E3E;">
      <strong>Wat betekent dit?</strong><br>
      Je Premium toegang blijft actief, maar we proberen de betaling binnenkort opnieuw. Zorg dat je betaalmethode up-to-date is.
    </div>
    
    <p>Mogelijke oorzaken:</p>
    <ul>
      <li>Onvoldoende saldo op je rekening</li>
      <li>Je betaalmethode is verlopen</li>
      <li>Je bank heeft de transactie geblokkeerd</li>
    </ul>
    
    <p>Je kunt ook zelf een nieuwe betaling starten:</p>
    
    <p style="text-align: center; margin-top: 32px;">
      <a href="https://perimenopauzeplan.lovable.app/subscription" class="button">
        Betaling bijwerken
      </a>
    </p>
    
    <p>Heb je vragen? Neem gerust contact met ons op.</p>
    <p>Hartelijke groet,<br>Team Perimenopauze Plan</p>
  `;
  
  return {
    subject: '⚠️ Je betaling voor Perimenopauze Plan is niet gelukt',
    html: getEmailWrapper(content, 'Je maandelijkse betaling is niet gelukt. Controleer je betaalmethode.')
  };
}

export function getTrialEndingEmail(userName: string, daysLeft: number): { subject: string; html: string } {
  const content = `
    <h1>Je proefperiode eindigt ${daysLeft === 1 ? 'morgen' : `over ${daysLeft} dagen`}</h1>
    <p>Hoi${userName ? ` ${userName}` : ''},</p>
    <p>Dit is een vriendelijke herinnering dat je gratis proefperiode bijna afloopt.</p>
    
    <div class="success-box">
      <strong>Geen actie nodig!</strong><br>
      Je Premium abonnement gaat automatisch door voor €7,50 per maand.
    </div>
    
    <h2>Je behoudt toegang tot:</h2>
    <ul>
      <li>🍽️ AI Maaltijdanalyses</li>
      <li>💡 Dagelijkse gepersonaliseerde inzichten</li>
      <li>📊 Trends & patronen in je data</li>
      <li>🧘 Bewegingsoefeningen op maat</li>
      <li>📈 Maandelijkse totaalanalyse</li>
    </ul>
    
    <p>Wil je toch stoppen? Dat kan eenvoudig via de app vóór het einde van je proefperiode.</p>
    
    <p style="text-align: center; margin-top: 32px;">
      <a href="https://perimenopauzeplan.lovable.app/subscription" class="button">
        Abonnement bekijken
      </a>
    </p>
    
    <p>Hartelijke groet,<br>Team Perimenopauze Plan</p>
  `;
  
  return {
    subject: `⏰ Nog ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'}: je Perimenopauze Plan trial eindigt binnenkort`,
    html: getEmailWrapper(content, `Je proefperiode eindigt over ${daysLeft} dagen. Je abonnement gaat automatisch door.`)
  };
}

export function getRefundProcessedEmail(userName: string, amount: string): { subject: string; html: string } {
  const content = `
    <h1>Je terugbetaling is verwerkt</h1>
    <p>Hoi${userName ? ` ${userName}` : ''},</p>
    <p>We hebben je terugbetaling van <strong>€${amount}</strong> verwerkt.</p>
    
    <div class="success-box">
      <strong>Terugbetaling onderweg!</strong><br>
      Het bedrag wordt binnen 5-10 werkdagen teruggestort op je rekening.
    </div>
    
    <p>Je abonnement is geannuleerd. Je hebt nu een gratis account.</p>
    
    <p>We vinden het jammer dat het niet paste, maar je bent altijd welkom om terug te komen!</p>
    
    <p style="text-align: center; margin-top: 32px;">
      <a href="https://perimenopauzeplan.lovable.app" class="button">
        Terug naar de app
      </a>
    </p>
    
    <p>Hartelijke groet,<br>Team Perimenopauze Plan</p>
  `;
  
  return {
    subject: '💸 Je terugbetaling is verwerkt',
    html: getEmailWrapper(content, `Je terugbetaling van €${amount} is verwerkt en onderweg naar je rekening.`)
  };
}

export function getAdminBroadcastEmail(subject: string, message: string): { subject: string; html: string } {
  const content = `
    <div style="line-height: 1.7;">
      ${message.replace(/\n/g, '<br>')}
    </div>
    
    <p style="margin-top: 32px;">Hartelijke groet,<br>Team Perimenopauze Plan</p>
  `;
  
  return {
    subject,
    html: getEmailWrapper(content, subject)
  };
}

// Send email via Resend API
export async function sendEmail(
  to: string, 
  subject: string, 
  html: string, 
  resendApiKey: string
): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Perimenopauze Plan <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      console.error("Resend API error:", response.status);
      return false;
    }

    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}
