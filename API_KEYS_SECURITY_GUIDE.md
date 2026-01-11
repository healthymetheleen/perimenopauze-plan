# 🔐 API Keys & Security Guide
## Veilig omgaan met API keys - GDPR Compliant

---

## 📋 Overzicht API Keys

Je app gebruikt de volgende externe services:

| Service | Wat doet het? | API Key Type | Kosten | GDPR Safe? |
|---------|--------------|--------------|--------|------------|
| **OpenAI** | ChatGPT AI chat | `OPENAI_API_KEY` | ~€15-50/maand | ✅ Ja (geanonimiseerd) |
| **Resend** | Email verzending | `RESEND_API_KEY` | €0-20/maand | ✅ Ja (EU servers) |
| **Mollie** | Betalingen | `MOLLIE_API_KEY` | €0 + 1.29% transactie | ✅ Ja (NL bedrijf) |
| **Anthropic** | AI (optioneel) | `ANTHROPIC_API_KEY` | Optioneel | ✅ Ja |

---

## 🔑 API Keys Verkrijgen

### 1. OpenAI API Key

**Registreren:**
1. Ga naar https://platform.openai.com
2. Klik **Sign Up** of **Log In**
3. Ga naar **API Keys** (links in menu)
4. Klik **Create new secret key**
5. Naam: `Perimenopauze Plan Production`
6. **Kopieer de key** (begint met `sk-proj-...`)
   - ⚠️ Je ziet deze maar 1 keer!
7. Bewaar in wachtwoord manager

**GDPR Setup (KRITISCH!):**
```
1. Ga naar: https://platform.openai.com/account/team-settings
2. Scroll naar "Data Controls"
3. Zet "Data retention" op "0 days"
4. Dit zorgt dat OpenAI NIETS bewaart
```

**Kosten beperken:**
```
1. Ga naar: https://platform.openai.com/account/billing/limits
2. Zet "Monthly budget" op €20 of €50
3. Zet "Email alerts" aan bij 50% en 80%
4. Zet "Hard limit" aan (stopt bij limiet)
```

**Rate Limiting:**
- App limiet: 50 berichten/gebruiker/dag
- Model: `gpt-4o-mini` (goedkoopst, goed genoeg)
- ~€0.15 per 1000 berichten
- Bij 100 actieve users: ~€15-25/maand

---

### 2. Resend API Key

**Registreren:**
1. Ga naar https://resend.com
2. Klik **Sign Up**
3. Verifieer email
4. Ga naar **API Keys** → **Create API Key**
5. Naam: `Perimenopauze Production`
6. **Kopieer de key** (begint met `re_...`)

**Email Domein Setup:**
```
1. Resend dashboard → "Domains" → "Add Domain"
2. Vul in: perimenopauzeplan.nl
3. Resend toont DNS records

4. Ga naar je domein provider (TransIP, Mijndomein, etc.)
5. Voeg deze DNS records toe:

   TXT record:
   Name: @
   Value: resend._domainkey.perimenopauzeplan.nl

   CNAME record:
   Name: resend._domainkey
   Value: [waarde van Resend]

6. Wacht 10-60 minuten
7. Klik in Resend op "Verify" ✅
```

**Gratis Tier:**
- 3000 emails/maand gratis
- Daarna: €20/maand voor 50,000 emails
- Voor starten is gratis tier ruim voldoende

---

### 3. Mollie API Key

**Registreren:**
1. Ga naar https://www.mollie.com/nl
2. Klik **Aanmelden**
3. Vul bedrijfsgegevens in
4. **KYC Verificatie:**
   - Upload identiteitsbewijs (paspoort/ID)
   - KvK uittreksel (indien bedrijf)
   - Wacht op goedkeuring (1-3 werkdagen)

**API Keys Ophalen:**
```
1. Mollie dashboard → "Developers" → "API Keys"
2. Je ziet twee keys:

   Test API Key: test_xxxxx
   Live API Key: live_xxxxx

3. Gebruik EERST test key om te testen
4. Pas daarna live key voor productie
```

**Test Betalingen:**
```
Test Creditcard:
  Nummer: 5555 5555 5555 4444
  Exp: 12/25
  CVV: 123
  Naam: Anything

Dit werkt alleen met test_xxxxx API key!
```

**Webhook URL Instellen:**
```
1. Mollie dashboard → "Developers" → "Webhooks"
2. Klik "Add Webhook"
3. URL: https://jouw-backend.sevalla.app/api/payments/webhook
4. Beschrijving: Perimenopauze Payments
5. Test de webhook (moet 200 OK geven)
```

---

## 🔒 API Keys Veilig Opslaan

### ❌ NOOIT Doen:

```javascript
// FOUT - Hardcoded in code!
const apiKey = "sk-proj-abc123xyz...";

// FOUT - In git repository
git add .env
```

### ✅ WEL Doen:

**1. Environment Variables (Server-side)**

**Op Sevalla:**
```
Sevalla Dashboard → Environment Variables → Add Variable

OPENAI_API_KEY=sk-proj-xxxxx
RESEND_API_KEY=re_xxxxx
MOLLIE_API_KEY=live_xxxxx
```

**Lokaal (development):**
```bash
# /backend/.env (staat in .gitignore!)
OPENAI_API_KEY=sk-proj-xxxxx
RESEND_API_KEY=re_xxxxx
MOLLIE_API_KEY=test_xxxxx  # Test key lokaal!
```

**2. .gitignore Check**

```bash
# Zorg dat dit in .gitignore staat:
.env
.env.local
.env.production
*.key
secrets/
```

**3. Verificatie**

```bash
# Check of .env NIET in git zit:
git status

# Als je .env ziet, is het FOUT!
# Fix:
git rm --cached .env
echo ".env" >> .gitignore
```

---

## 🌐 Environment Variables op Sevalla

### Via Dashboard (Aanbevolen):

```
1. Log in op Sevalla
2. Selecteer je service
3. Ga naar "Environment Variables"
4. Klik "Add Variable" voor elke key:

   NODE_ENV = production
   OPENAI_API_KEY = sk-proj-xxxxx
   RESEND_API_KEY = re_xxxxx
   MOLLIE_API_KEY = live_xxxxx
   JWT_SECRET = [64 random karakters]
   DATABASE_URL = postgres://...
   BACKEND_URL = https://jouw-app.sevalla.app
   FRONTEND_URL = https://www.perimenopauzeplan.nl
   CORS_ORIGIN = https://www.perimenopauzeplan.nl,https://perimenopauzeplan.nl
   FROM_EMAIL = noreply@perimenopauzeplan.nl

5. Klik "Save"
6. Restart je app: pm2 restart perimenopauze-api
```

### Via SSH (Alternatief):

```bash
# Connect via SSH
ssh jouw-username@jouw-server.sevalla.app

# Edit environment
nano /path/to/app/.env

# Voeg keys toe (zie template)
# Save: Ctrl+X → Y → Enter

# Restart app
pm2 restart perimenopauze-api
```

---

## 🛡️ GDPR Compliance voor API Calls

### OpenAI Anonimisatie

**Hoe het werkt:**

```typescript
// VOOR anonimisatie:
User input: "Ik ben Heleen, 45 jaar, heleen@example.nl, ik woon in Amsterdam..."

// Geanonimiseerd naar OpenAI:
Sent to OpenAI: "Ik ben [NAAM], [LEEFTIJD], [EMAIL], ik woon in [ADRES]..."

// Opgeslagen in database:
Database: NIETS - alleen metadata (user_id, tokens, timestamp)
```

**Wat wordt verwijderd:**
- ✅ Namen
- ✅ Email adressen
- ✅ Telefoonnummers
- ✅ Adressen & Postcodes
- ✅ BSN nummers
- ✅ Geboortedatums
- ✅ Leeftijden

**Code check:**
```typescript
// backend/src/routes/ai-chat.ts
function anonymizeMessage(message: string): string {
  // Alle PII wordt vervangen
  // Zie regel 24-56 in ai-chat.ts
}
```

---

## 🔄 API Keys Roteren (Best Practice)

**Wanneer?**
- ✅ Elke 90 dagen (preventief)
- ✅ Bij vermoeden van leak
- ✅ Bij personeelswissel
- ✅ Na security incident

**Hoe?**

**OpenAI:**
```
1. Maak nieuwe key in OpenAI dashboard
2. Update OPENAI_API_KEY in Sevalla env vars
3. Restart backend
4. Test AI chat werkt
5. Revoke oude key in OpenAI
```

**Resend:**
```
1. Resend → API Keys → Create new key
2. Update RESEND_API_KEY in Sevalla
3. Restart backend
4. Test email (signup of password reset)
5. Delete oude key in Resend
```

**Mollie:**
```
1. Mollie → Developers → API Keys
2. "Regenerate" live key
3. Update MOLLIE_API_KEY in Sevalla
4. Restart backend
5. Test betaling (met test eerst!)
```

---

## 🚨 Security Incident Response

### Als API Key Gelekt is:

**STAP 1: Immediate Action (binnen 1 uur)**
```
1. REVOKE de gelekte key ONMIDDELLIJK
   - OpenAI: https://platform.openai.com/api-keys → Revoke
   - Resend: https://resend.com/api-keys → Delete
   - Mollie: https://www.mollie.com/dashboard/developers/api-keys → Deactivate

2. Genereer nieuwe key
3. Update in Sevalla environment variables
4. Restart backend
```

**STAP 2: Assess Damage (binnen 4 uur)**
```
1. Check logs:
   - OpenAI: https://platform.openai.com/usage
   - Resend: https://resend.com/logs
   - Mollie: https://www.mollie.com/dashboard/payments

2. Zoek naar onbekende activiteit:
   - Onbekende API calls
   - Grote kosten spikes
   - Rare betaalverzoeken
```

**STAP 3: Document & Report (binnen 24 uur)**
```
1. Documenteer:
   - Wanneer gelekt?
   - Hoe ontdekt?
   - Welke key?
   - Schade?

2. Meld bij autoriteit als GDPR data gelekt:
   - Binnen 72 uur melden bij AP
   - Email: dataprotection@autoriteitpersoonsgegevens.nl
```

**STAP 4: Prevent Future**
```
1. Review access controls
2. Audit git repository (remove from history if committed)
3. Update .gitignore
4. Team training over API key security
```

---

## 📊 Monitoring & Alerts

### OpenAI Usage Alerts

```
1. https://platform.openai.com/account/billing/limits
2. Set "Email threshold" at 50% en 80%
3. Set "Hard limit" at €50/month
```

### Resend Email Alerts

```
1. https://resend.com/settings/notifications
2. Enable "Usage notifications"
3. Set threshold at 80% (2400 emails)
```

### Mollie Payment Alerts

```
1. https://www.mollie.com/dashboard/settings/notifications
2. Enable "Email notifications for failed payments"
3. Enable "Webhook failures"
```

---

## ✅ Security Checklist

Voor launch naar productie:

**API Keys:**
- [ ] Alle API keys staan in environment variables (NIET in code)
- [ ] .env file staat in .gitignore
- [ ] git history bevat geen API keys (check met `git log -p | grep "sk-proj"`)
- [ ] Test keys vervangen door live keys
- [ ] Mollie webhook URL ingesteld en getest

**GDPR:**
- [ ] OpenAI data retention op 0 dagen
- [ ] ChatGPT anonimisatie werkt (test met naam/email)
- [ ] Privacy policy gepubliceerd op /privacy-policy
- [ ] Cookie consent banner (indien analytics gebruikt)

**Monitoring:**
- [ ] OpenAI usage alerts ingesteld (€50 hard limit)
- [ ] Resend email alerts ingesteld
- [ ] Mollie webhook failures alerts
- [ ] Database backups dagelijks (Sevalla)

**Access Control:**
- [ ] Sevalla dashboard 2FA enabled
- [ ] OpenAI account 2FA enabled
- [ ] Mollie account 2FA enabled
- [ ] Admin accounts beperkt tot jou

---

## 💡 Best Practices Samenvatting

### DO ✅
- API keys in environment variables
- .gitignore voor .env files
- Keys roteren elke 90 dagen
- Monitoring & alerts instellen
- 2FA op alle accounts
- Test keys voor development
- Live keys alleen voor production

### DON'T ❌
- API keys in code hardcoden
- .env in git committen
- API keys delen via email/slack
- Dezelfde key voor dev en prod
- API keys in screenshots
- Public GitHub repo zonder secret scanning
- API keys in frontend JavaScript

---

## 📞 Support

**API Key Issues:**
- OpenAI: https://help.openai.com
- Resend: https://resend.com/support
- Mollie: https://help.mollie.com/hc/nl

**Security Incident:**
- Email: security@perimenopauzeplan.nl
- AP (GDPR): dataprotection@autoriteitpersoonsgegevens.nl

**Sevalla Support:**
- https://sevalla.com/support

---

## 🎓 Extra Resources

**GDPR:**
- Autoriteit Persoonsgegevens: https://autoriteitpersoonsgegevens.nl
- GDPR Checklist: https://gdpr.eu/checklist

**API Security:**
- OWASP API Security: https://owasp.org/API-Security/
- API Keys Best Practices: https://cloud.google.com/docs/authentication/api-keys-best-practices

**Environment Variables:**
- Dotenv documentation: https://github.com/motdotla/dotenv
- 12-Factor App: https://12factor.net/config

---

**Laatst bijgewerkt:** Januari 2026
**Versie:** 1.0
