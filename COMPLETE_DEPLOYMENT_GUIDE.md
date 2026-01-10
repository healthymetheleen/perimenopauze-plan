# 🚀 Complete Deployment Guide - Perimenopauze Plan
## Voor niet-technische gebruikers

Deze guide leidt je stap-voor-stap door het opzetten van je app. Volg elke stap zorgvuldig.

---

## 📋 Wat heb je nodig?

Voordat je begint, registreer je bij deze services (allemaal hebben gratis tiers of trial):

1. **GitHub** - Voor code opslag (https://github.com)
2. **Sevalla** - Voor backend en database (https://sevalla.com)
3. **Kinsta** - Voor frontend website (https://kinsta.com)
4. **OpenAI** - Voor AI chat functionaliteit (https://platform.openai.com)
5. **Resend** - Voor emails (https://resend.com)
6. **Mollie** - Voor betalingen (https://www.mollie.com/nl)

**Kosten overzicht (ongeveer):**
- Sevalla: €10-20/maand (database + backend)
- Kinsta: €0-10/maand (gratis tier beschikbaar)
- OpenAI: €10-50/maand (afhankelijk van gebruik)
- Resend: €0-20/maand (gratis tot 3000 emails/maand)
- Mollie: €0 + 1.29% transactiekosten

**Totaal: ongeveer €20-100/maand afhankelijk van gebruik**

---

## 📦 STAP 1: Code naar GitHub

### 1.1 - GitHub Repository maken

1. Ga naar https://github.com
2. Log in met je account
3. Klik rechtsboven op **+** → **New repository**
4. Vul in:
   - Repository name: `perimenopauzeplan`
   - Beschrijving: "Perimenopauze tracking app"
   - Selecteer: **Private** (zodat alleen jij het ziet)
5. Klik **Create repository**
6. **Kopieer de URL** die je ziet (bijvoorbeeld: `https://github.com/jouwnaam/perimenopauzeplan.git`)

### 1.2 - Code uploaden

**Op je Mac:**

```bash
# Open Terminal (cmd + spatie, typ "Terminal")

# Ga naar de code folder
cd /pad/naar/perimenopauze-plan

# Check of git geïnstalleerd is
git --version

# Als je een git versie ziet (bijv. git version 2.39.0), ga door
# Zo niet, installeer git eerst: https://git-scm.com/download/mac

# Stel git in (vervang met je eigen gegevens)
git config --global user.name "Jouw Naam"
git config --global user.email "jouw@email.nl"

# Push naar GitHub (vervang URL met jouw GitHub URL)
git remote add origin https://github.com/jouwnaam/perimenopauzeplan.git
git push -u origin claude/fix-cors-supabase-login-jegHA
```

✅ **Check:** Als je geen errors ziet, staat je code nu op GitHub!

---

## 🗄️ STAP 2: Database opzetten op Sevalla

### 2.1 - Sevalla Account

1. Ga naar https://sevalla.com
2. Maak een account aan
3. Kies een plan (WordPress Hosting werkt prima, €10-15/maand)
4. Voltooi de betaling

### 2.2 - PostgreSQL Database maken

1. Log in op Sevalla dashboard
2. Ga naar **Databases** → **Add Database**
3. Kies **PostgreSQL 17**
4. Database naam: `perimenopauzeplan`
5. Username: `heleen` (of jouw naam)
6. Wachtwoord: **Laat Sevalla een sterk wachtwoord genereren** (kopieer dit!)
7. Klik **Create Database**

### 2.3 - Database gegevens opslaan

Sevalla toont je deze gegevens. **Kopieer en bewaar ze veilig:**

```
Host: heleen-xxxxx-postgresql.heleen-xxxxx.svc.cluster.local
Port: 5432
Database: perimenopauzeplan
Username: heleen
Password: [gegenereerd wachtwoord]
```

Bouw hiervan de **DATABASE_URL**:

```
postgres://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
```

**Voorbeeld:**
```
postgres://heleen:AbC123XyZ@heleen-wxeda-postgresql.heleen-wxeda.svc.cluster.local:5432/perimenopauzeplan
```

⚠️ **BELANGRIJK:** Bewaar dit in een wachtwoord manager! Deel dit NOOIT openbaar.

---

## 🔧 STAP 3: API Keys verkrijgen (GDPR-veilig)

### 3.1 - OpenAI API Key (voor AI chat)

1. Ga naar https://platform.openai.com
2. Maak een account (of log in)
3. Ga naar **API Keys** → **Create new secret key**
4. Naam: `Perimenopauze Plan`
5. **Kopieer de key** (begint met `sk-proj-...`)
6. ⚠️ Je ziet deze maar 1 keer! Bewaar in wachtwoord manager.

**GDPR Setup:**
- Ga naar https://platform.openai.com/account/team-settings
- Scroll naar **Data Controls**
- Zet **Data retention** op **0 days**
- Dit zorgt dat OpenAI geen gesprekken bewaart

**Kosten beperken:**
- Ga naar **Billing** → **Usage limits**
- Zet **Monthly budget** op €20 of €50
- Zet **Email alerts** aan bij 50% en 80%

### 3.2 - Resend API Key (voor emails)

1. Ga naar https://resend.com
2. Maak een account (gratis tot 3000 emails/maand!)
3. Ga naar **API Keys** → **Create API Key**
4. Naam: `Perimenopauze Plan`
5. **Kopieer de key** (begint met `re_...`)

**Email domein setup:**
1. Ga naar **Domains** → **Add Domain**
2. Vul in: `perimenopauzeplan.nl`
3. Resend toont DNS records
4. Ga naar je domein provider (bijv. TransIP, Mijndomein)
5. Voeg de DNS records toe (TXT, CNAME)
6. Wacht 10-60 minuten
7. Klik in Resend op **Verify**

### 3.3 - Mollie API Key (voor betalingen)

1. Ga naar https://www.mollie.com/nl
2. Maak een account (gratis, betaal alleen transactiekosten)
3. Voltooi de **KYC verificatie** (identiteitsbewijs uploaden)
4. Ga naar **Developers** → **API Keys**
5. Kopieer de **Live API Key** (begint met `live_...`)
6. ⚠️ Voor testen: gebruik **Test API Key** (begint met `test_...`)

**Mollie Webhook URL** (kom hier later op terug):
```
https://jouw-backend-url.sevalla.app/api/payments/webhook
```

---

## 🚀 STAP 4: Backend deployen op Sevalla

### 4.1 - Code uploaden

**Optie A: Via GitHub (aanbevolen)**

1. Log in op Sevalla
2. Ga naar **Git** → **Add Git Deployment**
3. Connect GitHub
4. Selecteer repository: `perimenopauzeplan`
5. Branch: `claude/fix-cors-supabase-login-jegHA`
6. Root directory: `/backend`
7. Klik **Deploy**

**Optie B: Via SFTP (handmatig)**

1. Download **Cyberduck** (https://cyberduck.io) of **FileZilla**
2. Log in op Sevalla dashboard
3. Ga naar **SFTP Access** en kopieer gegevens
4. Maak verbinding met SFTP
5. Upload de `/backend` folder naar `/public_html/api`

### 4.2 - Environment Variables instellen

1. In Sevalla dashboard → **Environment Variables**
2. Klik **Add Variable**
3. Voeg één voor één ALLE variabelen toe:

```bash
NODE_ENV=production
PORT=3000
BACKEND_URL=https://jouw-sevalla-subdomain.sevalla.app
FRONTEND_URL=https://www.perimenopauzeplan.nl

# Database (gebruik jouw DATABASE_URL van stap 2.3!)
DATABASE_URL=postgres://heleen:JOUW_WACHTWOORD@heleen-xxxxx-postgresql.heleen-xxxxx.svc.cluster.local:5432/perimenopauzeplan

# JWT (genereer random string van 64 tekens op https://www.random.org/strings/)
JWT_SECRET=jouw-64-karakter-random-string-hier
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://www.perimenopauzeplan.nl,https://perimenopauzeplan.nl

# API Keys (gebruik je keys van stap 3!)
OPENAI_API_KEY=sk-proj-xxxxx
RESEND_API_KEY=re_xxxxx
MOLLIE_API_KEY=live_xxxxx

# Email
FROM_EMAIL=noreply@perimenopauzeplan.nl
```

⚠️ **Vervang ALLE placeholders met je echte waarden!**

### 4.3 - Dependencies installeren

1. In Sevalla → **SSH Access** → **Open Terminal**
2. Voer uit:

```bash
cd /public_html/api
npm install
npm run build
```

### 4.4 - Database schema initialiseren

```bash
npm run db:setup
```

Als je deze error ziet: `relation "users" already exists`, is dat OK! De database is al setup.

### 4.5 - Migratie uitvoeren

```bash
psql $DATABASE_URL -f src/db/migrations/001_update_subscriptions.sql
```

### 4.6 - Backend starten

**Optie A: Met PM2 (aanbevolen voor automatisch herstarten)**

```bash
npm install -g pm2
pm2 start npm --name "perimenopauze-api" -- start
pm2 save
pm2 startup
```

**Optie B: Met Node.js**

```bash
npm start
```

### 4.7 - Test de backend

Open in browser: `https://jouw-sevalla-url.sevalla.app/health`

Je zou moeten zien:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-01-10T..."
}
```

✅ **Backend is live!**

---

## 🌐 STAP 5: Frontend deployen op Kinsta

### 5.1 - Kinsta Account

1. Ga naar https://kinsta.com
2. Maak een account
3. Kies **Static Site Hosting** (gratis voor 100 sites!)

### 5.2 - Frontend bouwen

**Op je Mac:**

```bash
cd /pad/naar/perimenopauze-plan

# Installeer dependencies
npm install

# Update API URL in frontend
# Open .env file en voeg toe:
echo "VITE_API_URL=https://jouw-sevalla-url.sevalla.app" > .env

# Bouw de productie versie
npm run build
```

Dit maakt een `/dist` folder met je website.

### 5.3 - Uploaden naar Kinsta

**Via Git (aanbevolen):**

1. Push de build naar GitHub:
```bash
git add .
git commit -m "Production build"
git push
```

2. In Kinsta dashboard:
   - **Add service** → **Static site**
   - Connect GitHub
   - Selecteer `perimenopauzeplan` repo
   - Branch: `claude/fix-cors-supabase-login-jegHA`
   - Build command: `npm run build`
   - Publish directory: `dist`

**Via Upload (alternatief):**

1. Zip de `/dist` folder
2. In Kinsta → **Upload site**
3. Upload de ZIP
4. Klik **Publish**

### 5.4 - Custom domein instellen

1. In Kinsta → **Domains** → **Add domain**
2. Vul in: `www.perimenopauzeplan.nl`
3. Kinsta toont een **CNAME record**
4. Ga naar je domein provider
5. Voeg het CNAME record toe:
   ```
   www  →  CNAME  →  jouw-site.kinsta.app
   ```
6. Wacht 10-60 minuten voor DNS propagatie
7. SSL wordt automatisch aangemaakt door Kinsta

### 5.5 - Redirect apex domain (optioneel)

Voor `perimenopauzeplan.nl` (zonder www):

1. Bij domein provider → DNS
2. Voeg toe:
   ```
   @  →  URL Redirect  →  https://www.perimenopauzeplan.nl
   ```

✅ **Frontend is live op www.perimenopauzeplan.nl!**

---

## 🔐 STAP 6: Mollie Webhook configureren

1. Ga naar https://www.mollie.com/dashboard
2. **Developers** → **Webhooks**
3. Klik **Add Webhook**
4. URL: `https://jouw-sevalla-url.sevalla.app/api/payments/webhook`
5. Beschrijving: `Perimenopauze betalingen`
6. Klik **Save**

Test de webhook:
1. Ga naar **Payments** → **Create test payment**
2. Betaal €9.99 met test creditcard
3. Check in Sevalla logs of webhook is ontvangen

---

## ✅ STAP 7: Alles testen

### 7.1 - Health checks

- Backend: https://jouw-sevalla-url.sevalla.app/health
- Frontend: https://www.perimenopauzeplan.nl

### 7.2 - Account aanmaken

1. Ga naar https://www.perimenopauzeplan.nl
2. Klik **Registreren**
3. Vul gegevens in
4. Check je email voor welkomstmail (van Resend)

### 7.3 - Test functies

- ✅ Inloggen
- ✅ Dagboek entry maken
- ✅ Cyclus invoeren
- ✅ Recept bekijken
- ✅ AI chat gebruiken (test of OpenAI key werkt)

### 7.4 - Test betaling (met test key)

1. Vervang in Sevalla env vars de Mollie key tijdelijk met de **test key**
2. Start backend opnieuw
3. Probeer premium abonnement te kopen
4. Gebruik test creditcard: `5555 5555 5555 4444`, exp: `12/25`, CVV: `123`
5. Check of je premium toegang hebt

Als dit werkt:
1. Vervang Mollie test key met **live key**
2. Restart backend
3. ✅ Betalingen zijn live!

---

## 🛡️ STAP 8: GDPR Compliance Checklist

### ✅ Privacy Policy aanmaken

Maak een pagina op je website: `/privacy-policy`

**Template:** Zie `PRIVACY_POLICY_TEMPLATE.md` (wordt nog gegenereerd in volgende stap)

### ✅ Cookie Banner (indien nodig)

Als je analytics wilt (bijv. Google Analytics):

1. Voeg toe aan frontend:
```bash
npm install @cookiehub/cookie-consent-banner
```

2. Configureer alleen essentiële cookies zonder toestemming
3. Analytics/marketing cookies alleen met toestemming

**Let op:** De huidige app gebruikt GEEN tracking cookies, dus een banner is niet verplicht!

### ✅ Data Processing Agreement (DPA)

Check of je DPA's hebt met alle services:

- ✅ **OpenAI:** Data retention op 0 dagen gezet (stap 3.1)
- ✅ **Resend:** Automatisch GDPR compliant
- ✅ **Mollie:** Automatisch GDPR compliant (EU bedrijf)
- ✅ **Sevalla:** Check hun privacy policy

### ✅ Data Export & Verwijdering

De app heeft al endpoints voor:
- **Data export:** `GET /api/profile/export-data`
- **Account verwijderen:** `DELETE /api/profile/delete-account`

Zorg dat gebruikers deze kunnen vinden onder **Instellingen → Privacy**

### ✅ Checklist samenvatting

- [ ] Privacy policy gepubliceerd
- [ ] Cookie banner (indien nodig)
- [ ] OpenAI data retention op 0 dagen
- [ ] Mollie webhook werkt
- [ ] Data export functie beschikbaar voor gebruikers
- [ ] Account verwijdering functie beschikbaar
- [ ] SSL certificaat actief (HTTPS)
- [ ] Wachtwoorden gehashed met bcrypt ✅ (al in code)
- [ ] JWT tokens veilig opgeslagen ✅ (al in code)

---

## 🔍 STAP 9: Monitoring & Onderhoud

### 9.1 - Error monitoring (optioneel maar aanbevolen)

**Sentry** voor backend errors:

1. Ga naar https://sentry.io (gratis tier)
2. Maak project: `perimenopauze-backend`
3. Kopieer DSN key
4. Voeg toe aan backend code:

```bash
npm install @sentry/node
```

In `backend/src/server.ts`:
```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "jouw-sentry-dsn",
  environment: process.env.NODE_ENV,
});
```

### 9.2 - Uptime monitoring

**UptimeRobot** (gratis):

1. Ga naar https://uptimerobot.com
2. Maak account
3. Add Monitor:
   - URL: `https://jouw-sevalla-url.sevalla.app/health`
   - Interval: 5 minuten
4. Ontvang email bij downtime

### 9.3 - Database backups

In Sevalla:
1. **Databases** → **Backups**
2. Zet **Automatic backups** aan
3. Frequentie: Dagelijks
4. Retentie: 30 dagen

### 9.4 - Cost monitoring

Check maandelijks:
- OpenAI usage: https://platform.openai.com/usage
- Resend usage: https://resend.com/usage
- Mollie transacties: https://www.mollie.com/dashboard/payments
- Sevalla facturatie: Sevalla dashboard

---

## 🆘 Troubleshooting

### Backend start niet

```bash
# Check logs
pm2 logs perimenopauze-api

# Check environment variables
echo $DATABASE_URL

# Test database connectie
psql $DATABASE_URL -c "SELECT 1;"
```

### Frontend toont geen data

1. Open browser console (F12)
2. Kijk naar netwerk errors
3. Check of `VITE_API_URL` correct is
4. Test API endpoint direct in browser

### Emails komen niet aan

1. Check Resend dashboard → **Logs**
2. Controleer of domein geverifieerd is
3. Check spam folder
4. Test met `curl`:
```bash
curl -X POST https://jouw-backend.sevalla.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Betalingen werken niet

1. Check Mollie webhook URL
2. Ga naar Mollie dashboard → **Developers** → **Logs**
3. Kijk of webhook calls aankomen
4. Check Sevalla logs voor errors
5. Test met test API key eerst

### Database errors

```bash
# Reset database (VERWIJDERT ALLE DATA!)
npm run db:setup

# Backup maken eerst
pg_dump $DATABASE_URL > backup.sql

# Restore backup
psql $DATABASE_URL < backup.sql
```

---

## 📞 Support

Als je vast loopt:

1. Check de **Troubleshooting** sectie hierboven
2. Kijk in de logs (Sevalla dashboard)
3. Check GitHub Issues: https://github.com/jouwnaam/perimenopauzeplan/issues
4. Email support: support@perimenopauzeplan.nl

---

## 🎉 Klaar!

Je app is nu volledig live en GDPR-compliant! 🎊

**Belangrijke URLs:**
- Frontend: https://www.perimenopauzeplan.nl
- Backend: https://jouw-backend.sevalla.app
- Database: Sevalla dashboard
- GitHub: https://github.com/jouwnaam/perimenopauzeplan

**Volgende stappen:**
1. Test alle functionaliteit
2. Nodig beta testers uit
3. Schrijf content (blogs, social media)
4. Marketing opzetten

**Veel succes! 🌸**
