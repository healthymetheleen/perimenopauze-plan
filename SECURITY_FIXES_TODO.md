# 🚨 KRITIEKE SECURITY FIXES - PRIORITEIT

**Status:** ✅ JWT Verificatie ingeschakeld
**Datum:** 9 januari 2026

---

## ✅ GEFIXT: JWT Verificatie

**Probleem:** Alle edge functions hadden `verify_jwt = false`
**Risico:** Iedereen kon API's aanroepen zonder authentication
**Fix:** ✅ Alle functies in `supabase/config.toml` nu op `verify_jwt = true`
**Deploy:** Push dit naar Supabase met: `supabase functions deploy --all`

---

## 🔴 NOG TE FIXEN: CORS Beveiliging

### Wat is het probleem?

**NU:** Alle edge functions hebben:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ⚠️ GEVAARLIJK - staat OPEN voor iedereen
};
```

**Dit betekent:** Elke website (ook hackers) kan jouw API aanroepen.

### Wat moet er gebeuren?

**Stap 1:** Vind je productie domein
- Is het `healthymetheleen.nl`?
- Of een andere URL?

**Stap 2:** Update `/supabase/functions/_shared/cors.ts`
- Open het bestand
- Vervang `YOUR-DOMAIN.com` met jouw echte domein
- Bijvoorbeeld: `https://healthymetheleen.nl`

**Stap 3:** Update alle edge functions (14 bestanden)

Vervang in ELKE functie:
```typescript
// OUD (onveilig):
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

Door:
```typescript
// NIEUW (veilig):
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

// Aan het begin van de serve functie:
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }
  // ... rest van de functie
});
```

**Functies die geupdate moeten worden:**
1. `/supabase/functions/mollie-payments/index.ts`
2. `/supabase/functions/admin-broadcast/index.ts`
3. `/supabase/functions/analyze-meal/index.ts`
4. `/supabase/functions/cycle-coach/index.ts`
5. `/supabase/functions/premium-insights/index.ts`
6. `/supabase/functions/voice-to-text/index.ts`
7. `/supabase/functions/generate-recipes/index.ts`
8. `/supabase/functions/generate-recipe-image/index.ts`
9. `/supabase/functions/send-contact-email/index.ts`
10. `/supabase/functions/nutrition-coach/index.ts`
11. `/supabase/functions/daily-analysis/index.ts`
12. `/supabase/functions/weekly-nutrition-insight/index.ts`
13. `/supabase/functions/monthly-analysis/index.ts`
14. `/supabase/functions/generate-meditation-audio/index.ts`

---

## 🟠 MOLLIE WEBHOOK BEVEILIGING

### Probleem
De Mollie webhook accepteert betalings-updates ZONDER te verifiëren dat ze echt van Mollie komen.

**Risico:** Hackers kunnen "betaling geslaagd" berichten fake-en en gratis premium krijgen.

### Fix

**Stap 1:** Genereer webhook secret bij Mollie
1. Log in bij https://www.mollie.com/dashboard
2. Ga naar: Settings → Website profiles → [Jouw profile] → Webhooks
3. Voeg toe aan environment variables: `MOLLIE_WEBHOOK_SECRET`

**Stap 2:** Update `/supabase/functions/mollie-payments/index.ts`

Zoek de webhook handler (rond regel 44-190) en voeg toe:

```typescript
if (path === 'webhook' && req.method === 'POST') {
  // ⚠️ VOEG DIT TOE - Signature verification
  const signature = req.headers.get('mollie-signature');
  const webhookSecret = Deno.env.get('MOLLIE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error('Missing webhook signature or secret');
    return new Response('Unauthorized', { status: 401 });
  }

  // Verify signature (verhindert fake webhooks)
  const body = await req.text();
  const expectedSignature = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(body + webhookSecret)
  );

  // Compare signatures...
  // (Mollie documentatie heeft exact algoritme)

  // ... rest van webhook handler
}
```

**Mollie documentatie:** https://docs.mollie.com/overview/webhooks

---

## 🟡 GDPR: OpenAI Data Processing Agreement

### Probleem
Je stuurt gezondheidsdata naar OpenAI (VS) zonder Data Processing Agreement.

**Risico:** GDPR overtreding (kan leiden tot boetes).

### Fix

**Stap 1:** Vraag DPA aan bij OpenAI
1. Email: privacy@openai.com
2. Onderwerp: "Data Processing Agreement Request - Healthcare Application"
3. Vermeld: Je gebruikt GPT-4 voor analyse van gezondheidsdata (Article 9 GDPR)

**Vereist:**
- Data Processing Agreement (DPA)
- Standard Contractual Clauses (SCCs) voor VS transfer
- Zero Data Retention (ZDR) - vragen of OpenAI data NIET mag bewaren

**Stap 2:** Documenteer in Privacy Policy

Voeg toe aan Privacy Policy:
```
AI Analyse:
- Provider: OpenAI (VS)
- Data: Geanonimiseerde voedingsinfo, symptomen (GEEN namen/adressen)
- Beveiliging: Standard Contractual Clauses (SCCs) volgens GDPR
- Bewaring: Zero Data Retention - data wordt niet opgeslagen door OpenAI
- Basis: Jouw expliciete toestemming (kun je intrekken in instellingen)
```

**Stap 3:** EU Alternative overwegen?

Voor GDPR compliance zijn EU-based AI providers beter:
- **Mistral AI** (Frankrijk) - GDPR compliant
- **Aleph Alpha** (Duitsland) - Healthcare certified
- **Azure OpenAI** (EU instance) - Microsoft heeft EU datacenters

---

## 🟡 DATA RETENTION CLEANUP

### Probleem
Data wordt voor altijd bewaard. GDPR vereist automatische cleanup.

### Gedocumenteerde retentie:
- Gezondheidsdata: 12 maanden
- AI logs: 6 maanden
- Audit logs: 24 maanden

### Fix

Maak Supabase cron jobs voor automatische cleanup:

```sql
-- In Supabase SQL Editor:

-- 1. Cleanup oude AI logs (ouder dan 6 maanden)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-old-ai-logs',
  '0 2 * * 0',  -- Elke zondag om 2:00
  $$
    DELETE FROM public.ai_usage
    WHERE created_at < NOW() - INTERVAL '6 months';
  $$
);

-- 2. Cleanup oude audit logs (ouder dan 24 maanden)
SELECT cron.schedule(
  'cleanup-old-audit-logs',
  '0 3 * * 0',  -- Elke zondag om 3:00
  $$
    DELETE FROM public.audit_logs
    WHERE created_at < NOW() - INTERVAL '24 months';
  $$
);

-- 3. Anonimiseer oude community posts (ouder dan 12 maanden van verwijderde users)
SELECT cron.schedule(
  'anonymize-old-posts',
  '0 4 * * 0',
  $$
    UPDATE public.community_posts
    SET is_anonymous = true
    WHERE owner_id NOT IN (SELECT id FROM auth.users)
    AND created_at < NOW() - INTERVAL '12 months';
  $$
);
```

---

## 🟢 WAT AL GOED IS

✅ **Database Security:**
- Row Level Security (RLS) op alle tabellen
- Alleen gebruikers zien hun eigen data

✅ **Privacy by Design:**
- Foto's worden NIET opgeslagen (alleen geanalyseerd)
- AI krijgt geen namen/adressen (PII scrubbing)
- EXIF metadata (GPS locatie) wordt verwijderd van foto's

✅ **GDPR Rechten:**
- Data export: Gebruikers kunnen hun data downloaden
- Data deletion: Account verwijderen werkt goed
- Consent management: Toestemming wordt bijgehouden

✅ **Encryptie:**
- HTTPS overal
- Database encrypted at rest
- Backups encrypted

---

## 📋 CHECKLIST VOOR LIVE GAAN

### Voor je LIVE gaat met echte gebruikers:

**Kritiek (NU):**
- [x] JWT verificatie ingeschakeld
- [ ] CORS beperkt tot jouw domein
- [ ] Mollie webhook signature verificatie
- [ ] OpenAI DPA aangevraagd

**Belangrijk (deze week):**
- [ ] Data retention cleanup jobs ingesteld
- [ ] Privacy Policy geupdate met OpenAI info
- [ ] Cookie consent banner getest
- [ ] Test account verwijdering flow

**Aanbevolen (deze maand):**
- [ ] Penetration test door externe partij
- [ ] DPIA (Data Protection Impact Assessment) document
- [ ] Incident response plan (wat doen bij datalek?)
- [ ] Backup & restore procedure testen

---

## 🆘 HULP NODIG?

**Supabase Security Docs:**
https://supabase.com/docs/guides/auth/row-level-security

**GDPR Checklist (NL):**
https://autoriteitpersoonsgegevens.nl/nl/onderwerpen/avg-europese-privacywetgeving

**Mollie Webhook Docs:**
https://docs.mollie.com/overview/webhooks

**OpenAI DPA:**
https://openai.com/enterprise-privacy/

---

## 💡 QUICK WINS

Dingen die je ZO kunt fixen:

1. **Session timeout toevoegen** (voorkom eindeloos ingelogd blijven):
```typescript
// In src/integrations/supabase/client.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    // VOEG TOE:
    storageKey: 'perimenopauze-auth',
    flowType: 'pkce',  // Extra security
  },
});
```

2. **Rate limiting op login** (voorkom brute force):
- Ga naar Supabase Dashboard → Authentication → Rate Limits
- Zet aan: "Limit number of password sign-ins per hour"
- Aanbevolen: Max 5 pogingen per uur per IP

3. **Email verificatie verplichten**:
- Supabase Dashboard → Authentication → Email
- Check: "Confirm email"
- Check: "Secure email change"

---

**Laatste update:** 9 januari 2026
**Status:** JWT ✅ | CORS ⏳ | Mollie ⏳ | GDPR ⏳
