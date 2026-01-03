# HormoonBalans Dagboek

Een productie-waardige webapp voor vrouwen (30-50) met perimenopauze klachten. Gebaseerd op kPNI en orthomoleculaire inzichten. Warm, helder, zonder moraliserende toon.

## Stack

- React + Vite
- TypeScript
- Tailwind CSS
- Lovable Cloud (PostgreSQL + Auth)

## Privacy & Safety Regels

1. **Alleen synthetische mock data** - Nooit echte gezondheidsgegevens in prompts, seeds, logs of tests
2. **Geen health logging** - Geen macros, symptom codes of notities in logs
3. **Notes private** - Wordt niet gebruikt in summaries of AI input

## Security Acceptance Criteria Checklist

### Test Users Validatie

- [ ] Maak 2 test users A en B aan
- [ ] User A maakt data in alle tabellen:
  - [ ] `app.profiles`
  - [ ] `app.user_preferences`
  - [ ] `app.diary_days`
  - [ ] `app.meals`
  - [ ] `app.symptoms`
  - [ ] `app.daily_context`
  - [ ] `app.notes_private`
  - [ ] `app.notifications`
  - [ ] `app.audit_events`

### Data Isolatie Tests

- [ ] User B ziet 0 rijen van User A via UI
- [ ] User B ziet 0 rijen van User A via directe Supabase client calls
- [ ] Views retourneren alleen eigen data:
  - [ ] `app.v_daily_summary`
  - [ ] `app.v_daily_scores`
  - [ ] `app.v_trends_7d`
  - [ ] `app.v_symptom_patterns_14d`

### Notifications Security

- [ ] User kan alleen eigen notifications lezen
- [ ] User kan `is_read` updaten ✓
- [ ] User kan `read_at` updaten ✓
- [ ] User kan `status` NIET updaten ✗
- [ ] User kan `payload` NIET updaten ✗
- [ ] User kan `channel` NIET updaten ✗
- [ ] User kan `scheduled_at` NIET updaten ✗
- [ ] User kan geen notifications INSERT doen
- [ ] User kan geen notifications DELETE doen

### Service Role Key

- [ ] Service role key komt NIET voor in frontend code
- [ ] Service role key komt NIET voor in .env files in repo
- [ ] Alleen anon key gebruikt in client

### Catalog Tables

- [ ] `app.symptom_catalog` is read-only voor authenticated users
- [ ] `app.copy_catalog` is read-only voor authenticated users
- [ ] Beide catalogs hebben geen write policies voor authenticated role

## Database Schema

### Schema: `app`

#### Tabellen

| Tabel | Beschrijving | RLS |
|-------|-------------|-----|
| `profiles` | User display names | Owner only |
| `user_preferences` | Digest/notification settings | Owner only |
| `diary_days` | Dag entries met datum | Owner only |
| `meals` | Maaltijden met macros | Owner only |
| `symptoms` | Klachten met severity | Owner only |
| `daily_context` | Slaap, stress, cyclus | Owner only |
| `notes_private` | Persoonlijke notities | Owner only |
| `notifications` | In-app berichten | Owner select, restricted update |
| `audit_events` | Event logging | Owner select only |
| `symptom_catalog` | Klachten referentie | Read-only |
| `copy_catalog` | UI teksten referentie | Read-only |

#### Enums

- `delivery_channel`: in_app, push, email
- `notification_status`: queued, processing, sent, failed
- `redaction_status`: raw, redacted, blocked
- `cycle_phase`: menstrual, follicular, ovulatory, luteal, unknown

#### Views

| View | Beschrijving |
|------|-------------|
| `v_daily_summary` | Dag samenvatting met intake, timing, symptoms |
| `v_daily_scores` | Score 0-10 met reason codes |
| `v_trends_7d` | 7 dagen trend data |
| `v_symptom_patterns_14d` | Symptoom patronen high vs low severity |

#### Functions

| Functie | Beschrijving |
|---------|-------------|
| `get_or_create_diary_day(date)` | Maakt of haalt diary day op |
| `get_daily_summary(date)` | Retourneert JSON summary |

## Setup Stappen

### 1. Project Setup

```bash
# Clone repository
git clone <repo-url>
cd hormoonbalans-dagboek

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Lovable Cloud

Het project gebruikt Lovable Cloud voor de backend. Dit is automatisch geconfigureerd.

### 3. Environment Variables

De volgende variabelen worden automatisch geconfigureerd:

```
VITE_SUPABASE_URL=<auto>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto>
```

**BELANGRIJK**: Voeg NOOIT service role keys toe aan de frontend!

## Security Headers (Hosting)

Configureer de volgende headers in je hosting:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co;
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Rate Limiting

Implementeer rate limiting op:

- Login endpoint: max 5 pogingen per minuut per IP
- Gevoelige endpoints: max 60 requests per minuut per user

## Data Export

Users kunnen hun data exporteren via Settings. Export bevat:

- Profile informatie
- Preferences
- Diary days met meals, symptoms, context
- Geen notities (privacy)

## Delete Account

Users kunnen hun account verwijderen via Settings. Dit triggert:

1. Cascade delete van alle persoonlijke data
2. Auth user deletion
3. Audit event logging (geanonimiseerd)

## App Pagina's

| Route | Beschrijving |
|-------|-------------|
| `/login` | Authenticatie (email/password) |
| `/onboarding` | Eerste setup, preferences |
| `/dashboard` | Hoofdoverzicht, digest |
| `/days/:date` | Dag detail met tabs |
| `/trends` | 7-14 dagen trends |
| `/patterns` | Klacht ↔ patroon inzichten |
| `/settings` | Preferences, export, delete |
| `/legal` | Privacy, Terms, Disclaimer |

## Disclaimer

Dit is een educatieve tool en geen medisch hulpmiddel. Bij alarmsymptomen altijd contact opnemen met een huisarts of specialist.

## Fase 1 Deliverables

- [x] Database schema met alle tabellen
- [x] RLS policies op alle tabellen
- [x] Column-level grants op notifications
- [x] Symptom catalog seed (35 items)
- [x] Copy catalog seed (10 items)
- [x] Views: v_daily_summary, v_daily_scores, v_trends_7d, v_symptom_patterns_14d
- [x] Functions: get_or_create_diary_day, get_daily_summary
- [x] TypeScript types (src/lib/database.types.ts)
- [x] Zod validatie schemas (src/lib/validations.ts)
- [x] README met security checklist

## Fase 2 TODO

- [ ] UI componenten en pages
- [ ] Auth flow (login/signup)
- [ ] Onboarding wizard
- [ ] Dashboard met digest
- [ ] Day detail pages
- [ ] Trends grafieken
- [ ] Patterns tabel
- [ ] Settings page
- [ ] Legal pages
- [ ] Mock data seed button
