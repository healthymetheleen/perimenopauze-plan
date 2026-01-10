# KINSTA/SEVALLA COMPLETE MIGRATIE GUIDE

## 🎯 Doel
Volledig weg van Lovable - alles naar Kinsta en Sevalla migreren.

---

## ⚙️ FASE 1: Backend naar Sevalla (20 minuten)

### Stap 1.1: Database Initialiseren

**Op je lokale computer:**

```bash
cd backend
npm install
```

**Maak `.env` file:**
```bash
cp .env.example .env
```

**Bewerk `.env` en vul in:**
```env
NODE_ENV=development
DATABASE_URL=postgres://heleen:PADpyLc4FfNw@ma@heleen-wxeda-postgresql.heleen-wxeda.svc.cluster.local:5432/perimenopauzeplan
JWT_SECRET=<genereer-hieronder>
CORS_ORIGIN=http://localhost:5173
```

**Genereer JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Kopieer de output en plak in `.env` als `JWT_SECRET=...`

**Initialiseer database:**
```bash
npm run db:setup
```

✅ Je ziet: `Database setup completed successfully`

---

### Stap 1.2: Test Backend Lokaal

```bash
npm run dev
```

Je ziet:
```
╔═══════════════════════════════════════════════════════╗
║  Perimenopauze Plan API                               ║
║  Environment: development                             ║
║  Port: 3000                                           ║
╚═══════════════════════════════════════════════════════╝
```

**Test in browser:** http://localhost:3000/health

Je moet zien:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "..."
}
```

✅ **Backend werkt lokaal!**

---

### Stap 1.3: Deploy naar Sevalla

**In Sevalla Dashboard:**

1. Ga naar https://sevalla.com
2. Klik **"Services"** → **"Create Service"**
3. Kies **"Web Service"**

**Configuratie:**
```
Name: perimenopauzeplan-api
Environment: Node.js 20
Region: europe-west4 (Netherlands)
```

**Build & Deploy:**

**Optie A: Via ZIP Upload**
- Zip de hele `backend/` folder
- Upload in Sevalla dashboard

**Optie B: Via Git** (als je Git deployment hebt)
- Connect je GitHub repo
- Stel in: build from `backend/` folder

**Build Settings:**
```
Build Command: npm install && npm run build
Start Command: npm start
Port: 3000
Health Check Path: /health
```

**Environment Variables** (klik "Environment" tab):

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://heleen:PADpyLc4FfNw@ma@heleen-wxeda-postgresql.heleen-wxeda.svc.cluster.local:5432/perimenopauzeplan
JWT_SECRET=<DEZELFDE-ALS-LOKAAL>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=https://jouw-frontend-url.kinsta.app,https://www.perimenopauzeplan.nl,https://perimenopauzeplan.nl
RESEND_API_KEY=
MOLLIE_API_KEY=
MOLLIE_PROFILE_ID=
ANTHROPIC_API_KEY=
FROM_EMAIL=noreply@perimenopauzeplan.nl
```

⚠️ **Belangrijk:**
- `CORS_ORIGIN` moet je Kinsta URL bevatten!
- API keys kun je later toevoegen

**Deploy!**

Wacht 2-3 minuten...

**Kopieer je Backend URL** die Sevalla geeft:
```
https://perimenopauzeplan-api-XXXXX.sevalla.app
```

**Test:**
Ga naar: `https://perimenopauzeplan-api-XXXXX.sevalla.app/health`

✅ Je moet zien: `{"success": true, "message": "API is running"}`

---

## 🌐 FASE 2: Frontend naar Kinsta (30 minuten)

### Stap 2.1: Voorbereiding

**Maak `.env.production` in je project root:**
```env
VITE_API_URL=https://perimenopauzeplan-api-XXXXX.sevalla.app
```

⚠️ Vervang `XXXXX` met je echte Sevalla backend URL!

---

### Stap 2.2: Switch naar Nieuwe Auth

**Open `src/App.tsx`**

**Vind regel 7:**
```typescript
import { AuthProvider, useAuth } from "@/lib/auth";
```

**Vervang met:**
```typescript
import { AuthProvider, useAuth } from "@/lib/auth-new";
```

**Sla op!**

---

### Stap 2.3: Build voor Productie

```bash
npm install
npm run build
```

Dit maakt een `dist/` folder met je gebouwde app.

✅ Je ziet: `✓ built in XXs`

---

### Stap 2.4: Deploy naar Kinsta

**In Kinsta Dashboard:**

1. Ga naar https://kinsta.com/mykinsta
2. Klik **"Sites"** → **"Add Site"**
3. Kies **"Static Site"** of **"Application"**

**Voor Static Site (Eenvoudigst):**

1. **Upload `dist/` folder:**
   - Zip de `dist/` folder
   - Upload in Kinsta

2. **Of via Git:**
   - Connect GitHub repo
   - Build command: `npm run build`
   - Publish directory: `dist`

**Environment Variables in Kinsta:**
```
VITE_API_URL=https://perimenopauzeplan-api-XXXXX.sevalla.app
```

**Domain Setup:**
- Koppel je domein `www.perimenopauzeplan.nl`
- Of gebruik Kinsta's standaard subdomain eerst

**Deploy!**

---

### Stap 2.5: Update Backend CORS

**Nu je Kinsta URL hebt, update Sevalla backend:**

1. Ga terug naar Sevalla
2. Open je API service
3. Klik "Environment"
4. Update `CORS_ORIGIN`:

```
CORS_ORIGIN=https://jouw-site.kinsta.app,https://www.perimenopauzeplan.nl,https://perimenopauzeplan.nl
```

5. **Restart** de service

---

## 🧪 FASE 3: Testen (15 minuten)

### Test Checklist:

1. **Ga naar je Kinsta URL**
   - https://jouw-site.kinsta.app/login

2. **Maak NIEUWE account:**
   ```
   Email: test@example.com
   Password: TestPassword123!
   ```

3. **Login met nieuwe account**

4. **Test alle features:**
   - ✅ Dashboard laadt
   - ✅ Dagboek entry maken
   - ✅ Cyclus data toevoegen
   - ✅ Profiel bekijken
   - ✅ Recepten bekijken

5. **Check Browser Console** (F12):
   - Geen rode errors
   - API calls gaan naar Sevalla backend
   - Login succesvol

---

## 📦 FASE 4: Data Migreren (Optioneel)

**Als je bestaande data in Lovable Supabase hebt:**

### Optie A: Handmatige Export/Import

**Export van Lovable Supabase:**
1. Ga naar Supabase dashboard
2. SQL Editor
3. Exporteer data als CSV per tabel

**Import naar Sevalla PostgreSQL:**
```sql
COPY users FROM '/path/to/users.csv' CSV HEADER;
COPY profiles FROM '/path/to/profiles.csv' CSV HEADER;
-- etc...
```

### Optie B: Via Script (kan ik voor je maken)

Laat me weten als je data moet migreren, dan maak ik een migratie script.

---

## ✅ FASE 5: Opruimen

**Als alles werkt:**

1. **Stop Netlify deployment** (als je die had)
2. **Verwijder Lovable project** (of archiveer)
3. **Cancel Supabase subscription** (als je die had)

---

## 🎉 KLAAR!

**Je draait nu 100% op je eigen infrastructure:**

```
[Browser]
    ↓
[Kinsta - React Frontend]
    ↓ HTTPS API calls
[Sevalla - Express Backend]
    ↓ Internal network
[Sevalla - PostgreSQL Database]
```

**Geen Lovable meer!**
**Geen Supabase meer!**
**Volledige controle!**

---

## 💰 Kosten Overzicht

**Sevalla:**
- PostgreSQL: €X/maand
- Web Service: €X/maand
- Total: ~€X/maand

**Kinsta:**
- Static hosting: €X/maand
- Of gratis tier als beschikbaar

**Total: ~€XX/maand**

(Check actuele pricing op hun websites)

---

## 🆘 Hulp Nodig?

**Backend werkt niet:**
- Check Sevalla logs: Services → Je API → Logs
- Test health endpoint
- Verify DATABASE_URL

**Frontend kan niet verbinden:**
- Check CORS_ORIGIN in backend
- Verify VITE_API_URL in frontend
- Check browser console errors

**Database errors:**
- Run `npm run db:setup` opnieuw
- Check DATABASE_URL spelling
- Test met PostgreSQL client

---

## 📝 Handige Commands

**Backend ontwikkeling:**
```bash
cd backend
npm run dev          # Start dev server
npm run build        # Build productie
npm run db:setup     # Initialize database
```

**Frontend ontwikkeling:**
```bash
npm run dev          # Start dev server
npm run build        # Build productie
npm run preview      # Preview build
```

**Database:**
```bash
psql $DATABASE_URL   # Connect to database
```

---

**Succes met de migratie! 🚀**
