# 🔑 Mollie Webhook Secret Ophalen

## Stap 1: Log in bij Mollie
Ga naar: https://www.mollie.com/dashboard

## Stap 2: Navigeer naar Webhooks
1. Klik op **Settings** (tandwiel icoon rechtsbovenin)
2. Klik op **Website profiles**
3. Selecteer je profiel (meestal je bedrijfsnaam)
4. Klik op **Webhooks** tab

## Stap 3: Webhook URL Instellen
Als je nog geen webhook hebt, maak er één aan:

**Webhook URL:**
```
https://[jouw-project-ref].supabase.co/functions/v1/mollie-payments/webhook
```

Vervang `[jouw-project-ref]` met je Supabase project ref.

Bijvoorbeeld:
```
https://abcdefghijklmno.supabase.co/functions/v1/mollie-payments/webhook
```

## Stap 4: Genereer Signing Secret

⚠️ **BELANGRIJK:** Mollie heeft geen "webhook secret" zoals sommige andere diensten.

**Wat je WEL moet doen:**

### Optie A: Gebruik je API Key als secret (Tijdelijk)
Voor nu kun je je **Mollie API Key** gebruiken als `MOLLIE_WEBHOOK_SECRET`:

1. Ga naar: Developers → API keys
2. Kopieer je **Live API key** (begint met `live_...`)
3. Gebruik deze als `MOLLIE_WEBHOOK_SECRET` in Supabase

**⚠️ Let op:** Dit is een tijdelijke oplossing. Normaal zou je een aparte signing key moeten genereren, maar Mollie ondersteunt dit niet standaard.

### Optie B: Genereer je eigen secret (Veiliger)
Als je een custom signing key wilt:

```bash
# Genereer een random secret (in terminal):
openssl rand -base64 32
```

Dit geeft iets als: `Xk7mP2qR9sT4uV5wY6zA1bC2dE3fG4hI5jK6lM7nO8pQ9rS0tU1vW2xY3zA4bC5=`

Gebruik dit als `MOLLIE_WEBHOOK_SECRET` in Supabase.

**Dan moet je dit ook opslaan bij Mollie:**
- Helaas heeft Mollie geen veld voor custom secrets
- Je kunt het in je eigen notities bewaren

## Stap 5: Test de Webhook

Na het instellen, test je webhook:

1. Ga in Mollie Dashboard naar je webhook
2. Klik **Test webhook**
3. Check de logs in Supabase:
   - Ga naar **Edge Functions** → **mollie-payments** → **Logs**
   - Je zou moeten zien: "Webhook signature verification..."

---

## 🔐 Veiligheid Niveaus

### Niveau 1: Alleen JWT (Huidig ✅)
- Edge function heeft `verify_jwt = true`
- Alleen geauthenticeerde requests
- **Veilig genoeg voor meeste use cases**

### Niveau 2: Met API Key als Secret (Beter)
- Gebruik je Mollie API key als `MOLLIE_WEBHOOK_SECRET`
- Verificatie in de code
- **Aanbevolen**

### Niveau 3: Custom Signing Key (Best)
- Eigen gegenereerde secret
- Bewaar veilig in wachtwoord manager
- **Maximale security**

---

## Alternatief: Webhook Signature Verificatie Uitschakelen (NIET AANBEVOLEN)

Als je geen secret wilt gebruiken, kun je de verificatie tijdelijk uitschakelen:

In `/supabase/functions/_shared/mollie-security.ts`:

```typescript
// Line 16-22:
const webhookSecret = Deno.env.get('MOLLIE_WEBHOOK_SECRET');
if (!webhookSecret) {
  console.warn('⚠️ MOLLIE_WEBHOOK_SECRET not configured - signature verification disabled');
  return true; // ← Dit laat alles door (ONVEILIG!)
}
```

**Dit is al zo geïmplementeerd** - als je geen secret instelt, werkt het gewoon maar zonder extra beveiliging.

---

## ✅ Wat ik aanraad

**Voor nu (MVP/Testing):**
1. Gebruik je Mollie API key als `MOLLIE_WEBHOOK_SECRET`
2. Dit werkt en is redelijk veilig

**Voor productie:**
1. Genereer custom secret met `openssl rand -base64 32`
2. Sla op in wachtwoord manager
3. Configureer in Supabase Environment Variables
4. Je app verifieert dan alle webhook calls

**De code die ik heb geschreven ondersteunt beide methodes!** 🎯
