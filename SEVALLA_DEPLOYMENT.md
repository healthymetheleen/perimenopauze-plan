# 🚀 Sevalla Deployment Guide

Complete stap-voor-stap handleiding om je app volledig naar Sevalla te migreren.

---

## 📋 Voorbereidingen

### Wat Je Nodig Hebt:
- ✅ Sevalla account
- ✅ PostgreSQL database (al aangemaakt: `bd175368-0cb3-4ca6-ad9a-89d18fc76deb`)
- ✅ Backend code (in `backend/` folder)
- ✅ API keys:
  - Resend (voor emails)
  - Mollie (voor betalingen)
  - Anthropic (voor AI features)

---

## 🗄️ STAP 1: Database Initialiseren

### Op Je Lokale Computer:

1. **Ga naar de backend folder:**
   ```bash
   cd backend
   ```

2. **Installeer dependencies:**
   ```bash
   npm install
   ```

3. **Maak een .env file:**
   ```bash
   cp .env.example .env
   ```

4. **Bewerk .env en vul in:**
   ```env
   DATABASE_URL=postgres://heleen:PADpyLc4FfNw@ma@heleen-wxeda-postgresql.heleen-wxeda.svc.cluster.local:5432/perimenopauzeplan
   JWT_SECRET=<genereer-een-lange-random-string-hier>
   ```

   💡 **Tip**: Genereer JWT_SECRET met: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

5. **Initialiseer database:**
   ```bash
   npm run db:setup
   ```

   ✅ Dit maakt alle tabellen aan en seed default data.

---

## ☁️ STAP 2: Backend Deployen naar Sevalla

### In Sevalla Dashboard:

1. **Log in op** https://sevalla.com

2. **Klik op "Services" → "Add Service"**

3. **Kies "Web Service"**

4. **Vul in:**
   - **Name**: `perimenopauzeplan-api`
   - **Runtime**: `Node.js 20`
   - **Region**: `europe-west4` (Eemshaven, Netherlands)

5. **Upload je backend code:**
   - Zip de `backend/` folder
   - Upload via Sevalla dashboard

   OF gebruik Git deployment als je dat hebt ingesteld.

6. **Build & Start Commands:**
   ```
   Build Command: npm install && npm run build
   Start Command: npm start
   Port: 3000
   ```

7. **Environment Variables** (klik op "Environment"):
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgres://heleen:PADpyLc4FfNw@ma@heleen-wxeda-postgresql.heleen-wxeda.svc.cluster.local:5432/perimenopauzeplan
   JWT_SECRET=<jouw-random-string>
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d
   CORS_ORIGIN=https://www.perimenopauzeplan.nl,https://perimenopauzeplan.nl
   RESEND_API_KEY=<jouw-resend-key>
   MOLLIE_API_KEY=<jouw-mollie-key>
   MOLLIE_PROFILE_ID=<jouw-mollie-profile-id>
   ANTHROPIC_API_KEY=<jouw-anthropic-key>
   FROM_EMAIL=noreply@perimenopauzeplan.nl
   ```

8. **Klik "Deploy"**

9. **Wacht tot deployment klaar is** (duurt ~2-3 minuten)

10. **Kopieer de URL** van je deployed service
    - Bijvoorbeeld: `https://perimenopauzeplan-api.sevalla.app`

---

## 🌐 STAP 3: Frontend Updaten

### In Je Project:

1. **Maak een .env file** (als je die nog niet hebt):
   ```bash
   touch .env.local
   ```

2. **Voeg toe aan .env.local:**
   ```env
   VITE_API_URL=https://perimenopauzeplan-api.sevalla.app
   ```

   ⚠️ **Vervang de URL** met je echte Sevalla backend URL!

3. **Open `src/App.tsx`**

4. **Verander deze regel:**
   ```typescript
   // OUD:
   import { AuthProvider, useAuth } from "@/lib/auth";

   // NIEUW:
   import { AuthProvider, useAuth } from "@/lib/auth-new";
   ```

5. **Sla op en test lokaal:**
   ```bash
   npm run dev
   ```

6. **Test de login** op http://localhost:5173/login

7. **Als het werkt**, deploy naar Netlify:
   ```bash
   npm run build
   ```

   Netlify zal automatisch deployen als je pusht naar GitHub.

---

## ✅ STAP 4: Testen

### Test Checklist:

1. **Ga naar** https://www.perimenopauzeplan.nl/login

2. **Maak een nieuwe account:**
   - Email: `test@example.com`
   - Wachtwoord: `Test1234!`

3. **Log in met je nieuwe account**

4. **Test de volgende features:**
   - ✅ Dashboard laden
   - ✅ Dagboek entry maken
   - ✅ Cyclus data invoeren
   - ✅ Profiel bekijken/bewerken
   - ✅ Recepten bekijken

5. **Bekijk Browser Console** (F12):
   - Geen errors verwacht
   - API calls gaan naar je Sevalla backend

---

## 🔧 Troubleshooting

### Probleem: "Failed to fetch" errors

**Oplossing:**
1. Check of backend draait: ga naar `https://jouw-backend.sevalla.app/health`
2. Moet returnen: `{"success": true, "message": "API is running"}`

### Probleem: CORS errors

**Oplossing:**
1. Check `CORS_ORIGIN` in Sevalla environment variables
2. Moet je production domains bevatten
3. Restart backend service na wijziging

### Probleem: 401 Unauthorized

**Oplossing:**
1. Token is verlopen of ongeldig
2. Log uit en weer in
3. Clear browser localStorage: `localStorage.clear()`

### Probleem: Database connection errors

**Oplossing:**
1. Check `DATABASE_URL` in environment variables
2. Database moet internal hostname gebruiken (zoals in .env.example)
3. Test met: `npm run db:setup` lokaal

---

## 📊 Monitoring

### Health Check:
```
GET https://jouw-backend.sevalla.app/health
```

### Database Status:
Log in op Sevalla PostgreSQL dashboard om connecties te monitoren.

### Logs:
Bekijk logs in Sevalla dashboard onder "Services" → Je API service → "Logs"

---

## 🎉 Klaar!

Je app draait nu volledig op Sevalla:
- ✅ Backend API op Sevalla
- ✅ PostgreSQL database op Sevalla
- ✅ Frontend op Netlify
- ✅ Geen Supabase dependencies meer!

---

## 🔄 Volgende Stappen (Optioneel)

Deze features kun je later toevoegen:

1. **Email service** - Welkom emails, wachtwoord reset
2. **AI features** - Meal analysis, cycle coach
3. **Betalingen** - Mollie integratie voor premium
4. **File uploads** - Profile photos, meal photos
5. **Community** - Posts en comments

Voor hulp, zie `backend/README.md` voor API documentatie.

---

## ⚠️ Belangrijk

### NIET Vergeten:
- ✅ Backup van je database maken (via Sevalla dashboard)
- ✅ Environment variables veilig bewaren
- ✅ JWT_SECRET **NOOIT** in code commiten
- ✅ Test alles grondig voor je oude Supabase account verwijdert

### Oude Supabase:
Je kunt je oude Supabase project behouden als backup, of verwijderen als alles werkt.

---

**Succes! 🚀**
