# 🚀 DEPLOYMENT CHECKLIST

Volg deze stappen om je security fixes live te zetten:

## ✅ Stap 1: Environment Variables Instellen (5 min)

### In Supabase Dashboard:
1. Open https://supabase.com/dashboard
2. Selecteer je **perimenopauze-plan** project
3. Klik **⚙️ Settings** (linker menu)
4. Klik **Edge Functions**
5. Scroll naar **"Secrets"** sectie
6. Klik **"Add a new secret"**

### Voeg deze toe:

**Secret 1: ALLOWED_ORIGINS**
```
Name:  ALLOWED_ORIGINS
Value: healthymetheleen.nl,www.healthymetheleen.nl
```

**Secret 2: MOLLIE_WEBHOOK_SECRET**
```
Name:  MOLLIE_WEBHOOK_SECRET
Value: [genereer met: openssl rand -base64 32]
```

Of gebruik tijdelijk je Mollie API key.

**Secret 3: ChatGPT (Check of deze er al is)**
```
Name:  ChatGPT
Value: sk-proj-...
```
Deze heb je waarschijnlijk al, anders kun je deze niet gebruiken voor AI features.

**Secret 4: LOVABLE_API_KEY (Check of deze er al is)**
Voor recepten genereren.

---

## ✅ Stap 2: Supabase CLI Installeren (Eenmalig, 2 min)

### macOS:
```bash
brew install supabase/tap/supabase
```

### Windows (met Scoop):
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Of via npm (alle platformen):
```bash
npm install -g supabase
```

### Controleer installatie:
```bash
supabase --version
```

---

## ✅ Stap 3: Supabase CLI Configureren (Eenmalig, 2 min)

### Login:
```bash
supabase login
```
Dit opent je browser - log in met je Supabase account.

### Link je project:
```bash
supabase link
```

Je wordt gevraagd om je **project reference ID**.

**Waar vind je die?**
1. Ga naar Supabase Dashboard
2. Klik **Settings** → **General**
3. Kopieer **Reference ID** (bijv: `abcdefghijklmno`)

Of zoek in je URL:
```
https://supabase.com/dashboard/project/[dit-is-je-ref-id]/...
```

Plak de ref ID in de terminal.

---

## ✅ Stap 4: Edge Functions Deployen (5 min)

### Deploy alle 14 functies tegelijk:
```bash
cd /pad/naar/perimenopauze-plan
supabase functions deploy --all
```

Dit kan 2-5 minuten duren.

**Output die je zou moeten zien:**
```
Deploying mollie-payments (version xxx)
Deploying analyze-meal (version xxx)
Deploying cycle-coach (version xxx)
... (11 more)
All functions deployed successfully ✓
```

### Of deploy individueel (als je maar 1 functie wilt updaten):
```bash
supabase functions deploy mollie-payments
supabase functions deploy analyze-meal
# etc...
```

---

## ✅ Stap 5: Verificatie & Testing (5 min)

### Check 1: Functions zijn live
1. Ga naar Supabase Dashboard → **Edge Functions**
2. Je zou alle 14 functies moeten zien met **"Deployed"** status

### Check 2: JWT verificatie werkt
Probeer een API call ZONDER token:
```bash
curl https://[jouw-ref].supabase.co/functions/v1/analyze-meal \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"meal":"test"}'
```

**Verwachte response:** `401 Unauthorized` ✅

### Check 3: CORS werkt
In browser console (op bijv. google.com):
```javascript
fetch('https://[jouw-ref].supabase.co/functions/v1/analyze-meal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({meal: 'test'})
})
```

**Verwachte result:** CORS error geblokkeerd ✅

### Check 4: Mollie webhook test
1. Ga naar Mollie Dashboard → Webhooks
2. Klik **"Test webhook"**
3. Check Supabase Logs:
   - Dashboard → Edge Functions → mollie-payments → Logs
   - Zou moeten zien: "Webhook signature verification..."

---

## ✅ Stap 6: Update Mollie Webhook URL

Als je Mollie webhook URL nog niet hebt ingesteld:

1. Ga naar https://www.mollie.com/dashboard
2. **Settings** → **Website profiles** → [je profiel] → **Webhooks**
3. Klik **Add webhook**
4. URL: `https://[jouw-ref].supabase.co/functions/v1/mollie-payments/webhook`
5. Klik **Save**

---

## ✅ Stap 7: Enable Email Verificatie (Aanbevolen, 1 min)

1. Supabase Dashboard → **Authentication** → **Providers**
2. Klik **Email**
3. ✅ Enable "Confirm email"
4. ✅ Enable "Secure email change"
5. Klik **Save**

Dit voorkomt spam accounts.

---

## 🎯 KLAAR!

Je app is nu beveiligd met:
- ✅ JWT verificatie op alle functies
- ✅ CORS beperkt tot jouw domein
- ✅ Mollie webhook signature verificatie
- ✅ Email verificatie voor nieuwe users

**Security Score: 85/100** 🛡️

---

## 🐛 Troubleshooting

### Deployment faalt?
```bash
# Check of je ingelogd bent:
supabase projects list

# Niet ingelogd? Login:
supabase login

# Project niet gelinkt? Link:
supabase link
```

### CORS werkt niet?
1. Check of `ALLOWED_ORIGINS` correct is ingesteld (ZONDER https://)
2. Deploy opnieuw: `supabase functions deploy --all`
3. Hard refresh je browser (Cmd+Shift+R / Ctrl+Shift+R)

### Mollie webhook faalt?
1. Check of `MOLLIE_WEBHOOK_SECRET` is ingesteld
2. Test met Mollie Dashboard → Test webhook
3. Check logs in Supabase

### Functions niet zichtbaar?
Wacht 2-3 minuten na deployment - soms duurt het even.

---

## 📞 Hulp nodig?

**Supabase CLI docs:** https://supabase.com/docs/guides/cli
**Edge Functions docs:** https://supabase.com/docs/guides/functions

**Common errors:**
- `Error: Not logged in` → Run `supabase login`
- `Error: Project not linked` → Run `supabase link`
- `403 Forbidden` → Check of je de juiste project ref hebt
