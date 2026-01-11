# 🗄️ Sevalla Database Setup - Complete Stap-voor-Stap Guide

## Deel 1: Sevalla Account & Database Aanmaken

### Stap 1: Sevalla Account Maken

1. Ga naar **https://sevalla.com**
2. Klik op **"Start Free Trial"** of **"Sign Up"**
3. Vul je gegevens in:
   - Email adres
   - Wachtwoord
   - Bedrijfsnaam (bijv. "Perimenopauze Plan")
4. Bevestig je email
5. Log in op het Sevalla dashboard

### Stap 2: Hosting Plan Kiezen

1. In het dashboard, klik **"Add Service"**
2. Kies **"WordPress Hosting"** of **"Application Hosting"**
   - **Aanbevolen:** WordPress Hosting Pro (€15/maand)
   - Dit bevat: PostgreSQL database, Node.js support, SSL
3. Selecteer datacenter: **Amsterdam** (voor beste performance in EU)
4. Klik **"Continue"**

### Stap 3: PostgreSQL Database Aanmaken

1. In Sevalla dashboard → **"Databases"**
2. Klik **"Create Database"**
3. Vul in:
   ```
   Database Type: PostgreSQL 16
   Database Name: perimenopauzeplan
   Username: heleen
   Password: [Laat Sevalla genereren - klik "Generate Strong Password"]
   ```
4. **KOPIEER HET WACHTWOORD METEEN!** Je ziet het maar 1 keer
5. Klik **"Create Database"**

### Stap 4: Database Connection String Ophalen

Na het aanmaken zie je deze gegevens:

```
Host: heleen-xxxxx-postgresql.internal.sevalla.app
Port: 5432
Database: perimenopauzeplan
Username: heleen
Password: [gegenereerd wachtwoord]
```

**Bouw de DATABASE_URL:**
```bash
postgres://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

**Voorbeeld:**
```bash
postgres://heleen:XyZ123AbC456DeF@heleen-wxeda-postgresql.internal.sevalla.app:5432/perimenopauzeplan
```

⚠️ **BELANGRIJK:** Bewaar dit in een wachtwoord manager! (1Password, Bitwarden, etc.)

---

## Deel 2: Database Initialiseren vanaf je Mac

### Optie A: Via psql (Terminal)

#### Stap 1: Installeer PostgreSQL Client

```bash
# Als je Homebrew hebt:
brew install postgresql@16

# Check installatie:
psql --version
# Moet iets tonen zoals: psql (PostgreSQL) 16.x
```

#### Stap 2: Test Connectie

```bash
# Vervang met jouw DATABASE_URL
export DATABASE_URL="postgres://heleen:JOUW_WACHTWOORD@heleen-xxxxx-postgresql.internal.sevalla.app:5432/perimenopauzeplan"

# Test connectie
psql $DATABASE_URL -c "SELECT 1;"

# Moet tonen:
#  ?column?
# ----------
#         1
```

✅ Als je `1` ziet, werkt de connectie!

#### Stap 3: Database Schema Laden

```bash
# Ga naar je project folder
cd ~/pad/naar/perimenopauze-plan/backend

# Laad het schema
psql $DATABASE_URL -f src/db/schema.sql

# Je ziet output zoals:
# CREATE EXTENSION
# CREATE TABLE
# CREATE INDEX
# ...
```

#### Stap 4: Migraties Uitvoeren

```bash
# Migratie 1: Subscription updates
psql $DATABASE_URL -f src/db/migrations/001_update_subscriptions.sql

# Migratie 2: Admin role
psql $DATABASE_URL -f src/db/migrations/002_add_admin_role.sql
```

#### Stap 5: Maak Jezelf Admin

```bash
# Vervang met jouw email!
psql $DATABASE_URL -c "UPDATE users SET is_admin = TRUE WHERE email = 'jouw@email.nl';"

# Let op: Als je nog geen account hebt, krijg je:
# UPDATE 0
# Dat is normaal - maak eerst een account aan in de app, run dit daarna opnieuw
```

---

### Optie B: Via TablePlus (GUI Tool)

#### Stap 1: Download TablePlus

1. Ga naar **https://tableplus.com/**
2. Download voor macOS
3. Installeer de app

#### Stap 2: Maak Connectie

1. Open TablePlus
2. Klik **"Create a new connection"**
3. Selecteer **PostgreSQL**
4. Vul in:
   ```
   Name: Perimenopauze Sevalla
   Host: heleen-xxxxx-postgresql.internal.sevalla.app
   Port: 5432
   User: heleen
   Password: [jouw database wachtwoord]
   Database: perimenopauzeplan
   ```
5. Klik **"Test"** → Moet groen worden
6. Klik **"Connect"**

#### Stap 3: Schema Laden via TablePlus

1. Klik op **"SQL"** knop (of Cmd+T)
2. Open het bestand `backend/src/db/schema.sql`
3. Kopieer de hele inhoud
4. Plak in TablePlus SQL venster
5. Klik **"Run"** (of Cmd+Enter)
6. Wacht tot alle statements uitgevoerd zijn

#### Stap 4: Migraties via TablePlus

Herhaal stap 3 voor:
- `backend/src/db/migrations/001_update_subscriptions.sql`
- `backend/src/db/migrations/002_add_admin_role.sql`

#### Stap 5: Maak Jezelf Admin

1. Nieuwe SQL query:
   ```sql
   UPDATE users SET is_admin = TRUE WHERE email = 'jouw@email.nl';
   ```
2. Run de query

---

## Deel 3: Backend Deployen naar Sevalla

### Stap 1: Upload Backend Code

**Optie A: Via Git (Aanbevolen)**

1. In Sevalla dashboard → **"Git Deployments"**
2. Klik **"Add Git Deployment"**
3. Connect GitHub
4. Selecteer repository: `perimenopauze-plan`
5. Branch: `claude/fix-cors-supabase-login-jegHA`
6. **Root Directory:** `/backend`
7. **Build Command:** `npm install && npm run build`
8. **Start Command:** `npm start`
9. Klik **"Deploy"**

**Optie B: Via SFTP**

1. Sevalla dashboard → **"SFTP Access"**
2. Download credentials
3. Open Cyberduck of FileZilla
4. Connect via SFTP
5. Upload de `/backend` folder naar `/public_html/api`

### Stap 2: Environment Variables Instellen

1. Sevalla dashboard → **"Environment Variables"**
2. Voeg ALLE variabelen toe (klik "Add Variable" voor elke):

```bash
# Server
NODE_ENV=production
PORT=3000
BACKEND_URL=https://jouw-app.sevalla.app
FRONTEND_URL=https://www.perimenopauzeplan.nl

# Database (gebruik jouw DATABASE_URL!)
DATABASE_URL=postgres://heleen:WACHTWOORD@heleen-xxxxx-postgresql.internal.sevalla.app:5432/perimenopauzeplan

# JWT Secret (genereer random string op https://www.random.org/strings/)
JWT_SECRET=genereer-64-karakter-random-string-hier
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://www.perimenopauzeplan.nl,https://perimenopauzeplan.nl

# OpenAI (krijg je van https://platform.openai.com)
OPENAI_API_KEY=sk-proj-xxxxx

# Resend (krijg je van https://resend.com)
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@perimenopauzeplan.nl

# Mollie (krijg je van https://www.mollie.com)
MOLLIE_API_KEY=live_xxxxx

# Anthropic (optioneel)
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

⚠️ **KRITISCH:** Vervang ALLE placeholders met echte waarden!

### Stap 3: Start Backend

**Via Sevalla SSH:**

1. Sevalla dashboard → **"SSH Access"**
2. Klik **"Open Terminal"**
3. Voer uit:

```bash
cd /public_html/api

# Installeer dependencies
npm install

# Build TypeScript
npm run build

# Start met PM2 (blijft draaien na disconnect)
npm install -g pm2
pm2 start npm --name "perimenopauze-api" -- start
pm2 save
pm2 startup

# Check of het draait
pm2 status
```

### Stap 4: Test de API

```bash
# In terminal op je Mac:
curl https://jouw-app.sevalla.app/health

# Moet tonen:
# {"success":true,"message":"API is running","timestamp":"2026-01-11T..."}
```

✅ **Backend is live!**

---

## Deel 4: Database Backup Instellen

### Automatische Backups

1. Sevalla dashboard → **"Databases"** → **"perimenopauzeplan"**
2. Tab **"Backups"**
3. Enable **"Automatic Backups"**
4. Frequentie: **Dagelijks**
5. Retentie: **30 dagen**
6. Tijd: **03:00 AM** (lage traffic tijd)

### Handmatige Backup (voor zekerheid)

```bash
# Op je Mac - maak een lokale backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Bewaar deze in Google Drive / Dropbox
```

---

## Deel 5: Troubleshooting

### Probleem: "connection refused"

**Oplossing:**
```bash
# Check of host correct is
ping heleen-xxxxx-postgresql.internal.sevalla.app

# Check of port 5432 open is
nc -zv heleen-xxxxx-postgresql.internal.sevalla.app 5432
```

Als ping faalt: Gebruik **internal** hostname (niet public)

### Probleem: "password authentication failed"

**Oplossing:**
1. Reset wachtwoord in Sevalla dashboard
2. Update DATABASE_URL
3. Restart backend: `pm2 restart perimenopauze-api`

### Probleem: "relation users does not exist"

**Oplossing:**
```bash
# Schema is niet geladen - run opnieuw:
psql $DATABASE_URL -f backend/src/db/schema.sql
```

### Probleem: Backend start niet

**Oplossing:**
```bash
# Check logs
pm2 logs perimenopauze-api

# Common issues:
# - DATABASE_URL fout → check env vars
# - NODE_ENV niet production → check env vars
# - Port in gebruik → restart: pm2 restart perimenopauze-api
```

---

## Deel 6: Security Checklist

Voordat je live gaat:

- [ ] Database wachtwoord is sterk (gegenereerd door Sevalla)
- [ ] DATABASE_URL staat ALLEEN in environment variables (niet in code!)
- [ ] JWT_SECRET is random 64+ karakters
- [ ] CORS_ORIGIN bevat ALLEEN jouw domains
- [ ] SSL certificaat is actief (Sevalla doet dit automatisch)
- [ ] Backups staan aan (dagelijks)
- [ ] API keys zijn valid en in environment variables
- [ ] Test database connectie werkt
- [ ] Health endpoint `/health` is bereikbaar

---

## Quick Reference

**Database Connectie Testen:**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

**Nieuwe Tabel Toevoegen:**
```bash
# Maak migration file: backend/src/db/migrations/003_my_changes.sql
# Run het:
psql $DATABASE_URL -f backend/src/db/migrations/003_my_changes.sql
```

**Maak User Admin:**
```bash
psql $DATABASE_URL -c "UPDATE users SET is_admin = TRUE WHERE email = 'email@example.nl';"
```

**Backend Herstarten:**
```bash
# Via Sevalla SSH:
pm2 restart perimenopauze-api
pm2 logs perimenopauze-api
```

**Database Backup:**
```bash
pg_dump $DATABASE_URL > backup.sql
```

**Database Restore:**
```bash
psql $DATABASE_URL < backup.sql
```

---

## 🎉 Klaar!

Je database is nu:
- ✅ Opgezet op Sevalla
- ✅ Schema geladen
- ✅ Migraties uitgevoerd
- ✅ Backups ingeschakeld
- ✅ Verbonden met backend
- ✅ Veilig geconfigureerd

**Volgende stap:** Deploy de frontend naar Kinsta (zie `COMPLETE_DEPLOYMENT_GUIDE.md`)
