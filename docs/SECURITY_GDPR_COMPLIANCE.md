# 🔒 Security & GDPR Compliance Documentation

## Perimenopauze Plan App - EU Privacy & Security Audit

**Versie:** 2.2  
**Datum:** 2026-01-04  
**Status:** ✅ Production Ready

---

## Inhoudsopgave

1. [Data Classificatie & Bewaartermijnen](#a-data-classificatie--bewaartermijnen)
2. [Row Level Security](#b-row-level-security-policies)
3. [FORCE RLS Hardening](#c-force-rls-hardening)
4. [Storage Hardening](#d-storage-hardening)
5. [Auth & Toegang](#e-auth--toegang)
6. [Edge Functions Security](#f-edge-functions-security)
7. [AI & PII Stripping](#g-ai--pii-stripping)
8. [GDPR Features](#h-gdpr-features)
9. [Consent Management](#i-consent-management)
10. [Subverwerkers & Internationale Doorgifte](#j-subverwerkers--internationale-doorgifte)
11. [Security Tests](#k-security-tests)
12. [Operational Security Checklist](#l-operational-security-checklist)

---

## A) Data Classificatie & Bewaartermijnen

### Bijzondere Persoonsgegevens (Art. 9 GDPR - Gezondheidsdata)

| Tabel | Data | Bewaartermijn | Grondslag | Doel |
|-------|------|---------------|-----------|------|
| `meals` | Eetmomenten, voedingswaarden | 12 maanden | Toestemming (Art. 9.2.a) | Inzicht in voedingspatronen |
| `symptoms` | Klachten, ernstscores | 12 maanden | Toestemming | Patroonherkenning |
| `bleeding_logs` | Menstruatiedata | 12 maanden | Toestemming | Cyclus tracking |
| `cycle_symptom_logs` | Cyclusklachten | 12 maanden | Toestemming | Cyclus tracking |
| `fertility_signals` | BBT, LH-tests | 12 maanden | Toestemming | Vruchtbaarheidsinzicht |
| `sleep_sessions` | Slaapdata | 12 maanden | Toestemming | Slaappatronen |
| `cycles` | Cyclushistorie | 12 maanden | Toestemming | Cyclus tracking |

### Gewone Persoonsgegevens

| Tabel | Data | Bewaartermijn | Grondslag |
|-------|------|---------------|-----------|
| `profiles` | Displaynaam | Account levensduur | Contract (Art. 6.1.b) |
| `user_consents` | Toestemmingen | Account + 5 jaar | Wettelijke plicht (Art. 6.1.c) |
| `subscriptions` | Abonnementsinfo | Account levensduur | Contract |

### Operationele Metadata

| Tabel | Data | Bewaartermijn | Rationale |
|-------|------|---------------|-----------|
| `ai_usage` | AI-aanroepen (geen inhoud) | 6 maanden | Rate limiting, abuse detection |
| `ai_insights_cache` | Gecachete inzichten | 6 maanden | Performance, kostenbeheersing |
| `audit_logs` | Security events | 24 maanden | **Niet wettelijk verplicht**; gekozen voor incident investigation en accountability. Periodiek evalueren of korter kan. |
| `consent_history` | Toestemmingshistorie | 5 jaar na account | Aantoonbaarheid toestemming (Art. 7.1) |

⚠️ **Let op**: 24 maanden voor audit logs is een keuze, geen wettelijke verplichting. Dit is verdedigbaar vanuit security en accountability, maar niet generiek vereist voor wellness apps.

---

## B) Row Level Security Policies

### Principe: Default Deny + FORCE RLS

- ✅ Alle 28 tabellen hebben RLS enabled
- ✅ 24 tabellen hebben FORCE RLS (voorkomt bypass door table owners)
- ✅ Reference tabellen (exercises, meditations, etc.) hebben RLS maar geen FORCE

### Policy Patronen

```sql
-- Standaard patroon voor owner_id tabellen
CREATE POLICY "table_select" ON table FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "table_insert" ON table FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "table_update" ON table FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "table_delete" ON table FOR DELETE USING (auth.uid() = owner_id);

-- Admin-only tabellen
CREATE POLICY "admin_only" ON table FOR ALL USING (has_role(auth.uid(), 'admin'));
```

---

## C) FORCE RLS Hardening

FORCE RLS voorkomt dat table owners of rollen met elevated privileges RLS bypassen.

### Tabellen met FORCE RLS

**Gezondheidsdata:**
- meals, symptoms, daily_context, diary_days
- bleeding_logs, cycle_symptom_logs, fertility_signals
- sleep_sessions, cycles, cycle_predictions, cycle_preferences

**Persoonlijke data:**
- profiles, user_consents, consent_history
- subscriptions, entitlements

**Security-kritisch:**
- user_roles, audit_logs
- ai_usage, ai_insights_cache

**User-generated content:**
- community_posts, community_comments, community_likes, recipes

### Tabellen ZONDER FORCE RLS (bewuste keuze)

- `exercises`, `meditations`, `symptom_catalog`, `nutrition_settings`
- Reden: Dit zijn admin-beheerde reference tabellen, geen user data

---

## D) Storage Hardening

### Bucket Configuratie

| Bucket | Publiek | FORCE RLS | Doel |
|--------|---------|-----------|------|
| `content-images` | ❌ Nee | N/A | App content (meditaties, oefeningen) |
| `user-uploads` | ❌ Nee | N/A | Gebruikersuploads |

### Policies

```sql
-- User uploads: alleen eigen folder
CREATE POLICY "user_uploads_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Content: admins beheren, authenticated users lezen
CREATE POLICY "content_images_auth_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'content-images' 
  AND auth.uid() IS NOT NULL
);
```

### Account Deletion

De `delete_user_data()` functie verwijdert nu ook:
- Alle bestanden in `user-uploads/{user_id}/`
- Logs het aantal verwijderde bestanden in audit_logs

---

## E) Auth & Toegang

### Configuratie
- ✅ Email confirmatie: Aan (production) / Auto (development)
- ✅ Anonieme gebruikers: **Uitgeschakeld**
- ✅ Password policy: Minimum 8 karakters
- ⚠️ Leaked password protection: **Handmatig inschakelen vereist**

### Rollen
```sql
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

-- Veilige role check (SECURITY DEFINER + search_path)
CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role) $$;
```

### Service Role
- ❌ Nooit in client-side code
- ❌ Nooit in frontend environment variables
- ✅ Alleen in Edge Functions
- ✅ Alleen voor admin operaties (audit logs, cleanup)

---

## F) Edge Functions Security

### Architectuur

```
┌─────────────┐     ┌─────────────────┐     ┌──────────┐
│  Client     │────▶│  Edge Function  │────▶│  OpenAI  │
│  (no keys)  │     │  (rate limited) │     │          │
└─────────────┘     └────────┬────────┘     └──────────┘
                             │
                    ┌────────▼────────┐
                    │  Supabase DB    │
                    │  (RLS active)   │
                    └─────────────────┘
```

### Security per Function

| Function | Auth | Rate Limit | Consent | PII in Prompt |
|----------|------|------------|---------|---------------|
| `analyze-meal` | JWT | 30/dag | ✅ | ❌ Geen |
| `premium-insights` | JWT | 30/dag | ✅ | ❌ Geen |
| `cycle-coach` | JWT | 30/dag | ✅ | ❌ Geen |
| `monthly-analysis` | JWT | 3/maand | ✅ | ❌ Geen |

---

## G) AI & PII Stripping

### ALLOWLIST Approach

We gebruiken een **strikte allowlist** voor AI prompts. Alleen expliciet toegestane velden worden doorgestuurd:

```typescript
const AI_ALLOWLIST_FIELDS = new Set([
  // Geaggregeerde data
  'mealsCount', 'avgDuration', 'avgQuality', 'patterns', 'totals',
  
  // Categorische data
  'cycleSeason', 'cyclePhase', 'sleepQuality', 'stressLevel', 'energy',
  
  // Numerieke scores
  'score', 'level', 'count', 'total', 'average',
]);
```

### BLOCKLIST (altijd verwijderd)

```typescript
const AI_BLOCKLIST_FIELDS = new Set([
  'id', 'user_id', 'owner_id', 'email', 'name', 'display_name',
  'created_at', 'updated_at', 'ip_address', 'user_agent',
  'phone', 'address', 'location', 'employer', 'job_title',
  'birthday', 'birthdate', 'age', 'gender',
]);
```

### Free-text Redactie

Voor vrije tekst (als absoluut noodzakelijk):
```typescript
export function redactPIIFromText(text: string): string {
  // Verwijdert: emails, telefoonnummers, postcodes, namen
  // WAARSCHUWING: Best-effort, geen garantie
}
```

### Logging Policy

- ✅ Log dat anonymization is toegepast
- ❌ Log NOOIT voor/na inhoud
- ❌ Log NOOIT ruwe user input
- ❌ Log NOOIT AI responses met potentiële PII

---

## H) GDPR Features

### 1. Data Export (DSAR)

```sql
SELECT export_user_data_complete(auth.uid());
```

Inclusief:
- Alle persoonlijke data uit alle tabellen
- Storage file references (met instructie voor signed URLs)
- Export metadata (timestamp, versie, type)

### 2. Account Deletion

```sql
SELECT delete_user_data(auth.uid());
```

Acties:
1. Verwijdert alle storage bestanden
2. Anonimiseert community content
3. Verwijdert alle persoonlijke data
4. Logt actie in audit_logs (minimale metadata)

### 3. Consent Withdrawal

```sql
SELECT withdraw_consent(auth.uid(), 'ai_processing');
-- Of: 'health_data_processing', 'all'
```

Effecten:
- AI consent: verwijdert AI cache, stopt AI analyses
- Health data: markeert, adviseert full delete
- All: beide + log voor opvolging

---

## I) Consent Management

### Consent Types

| Type | Verplicht | Effect bij weigeren |
|------|-----------|---------------------|
| `terms` | ✅ Ja | Kan app niet gebruiken |
| `privacy` | ✅ Ja | Kan app niet gebruiken |
| `health_data_processing` | ✅ Ja | Core functionaliteit uit |
| `ai_processing` | ❌ Nee | AI features uit, handmatig invoeren |
| `disclaimer` | ✅ Ja | MDR compliance |

### Consent Record

```typescript
interface UserConsent {
  accepted_terms: boolean;
  accepted_privacy: boolean;
  accepted_health_data_processing: boolean;
  accepted_ai_processing: boolean;
  accepted_disclaimer: boolean;
  consent_version: string;      // e.g., "1.0"
  terms_version: string;        // e.g., "1.0"
  privacy_policy_version: string;
  accepted_at: timestamp;
}
```

### Consent History

Elke wijziging wordt gelogd in `consent_history`:
- consent_type
- consent_given (true/false)
- consent_version
- timestamp

---

## J) Subverwerkers & Internationale Doorgifte

### Subverwerkers

| Partij | Dienst | Locatie | DPA Status | Data Flow |
|--------|--------|---------|------------|-----------|
| Supabase | Database, Auth, Storage | EU (Frankfurt) | ✅ Standaard DPA | Alle data |
| OpenAI | AI analyse | US | ⚠️ SCCs vereist | Alleen geanonimiseerde features |
| Mollie | Betalingen | NL | ✅ EU-gebaseerd | Alleen payment data |

### OpenAI Doorgifte

**Data die naar OpenAI gaat:**
- Categorische features (cyclefase, energieniveau)
- Geaggregeerde statistieken
- GEEN: user IDs, emails, namen, datums, exacte tijden

**Maatregelen:**
- Allowlist filtering
- Text redactie
- Geen logging van prompts/responses

**Vereist:**
- Standard Contractual Clauses (SCCs)
- Documentatie in privacy policy

---

## K) Security Tests

### RLS Test Queries

Zie: `docs/RLS_TEST_QUERIES.sql`

Kernpunten:
1. Kan ik data van andere users lezen? → 0 rows
2. Kan ik data voor andere users inserten? → Error
3. Kan ik mezelf admin maken? → Error
4. Kan ik audit logs lezen (als non-admin)? → 0 rows

### FORCE RLS Verificatie

```sql
SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
-- Alle sensitive tables moeten TRUE, TRUE hebben
```

### Function Security Check

```sql
SELECT proname, prosecdef, 
       pg_get_functiondef(oid) LIKE '%search_path%' as has_search_path
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND prosecdef = true;
-- Alle SECURITY DEFINER functies moeten search_path hebben
```

---

## L) Operational Security Checklist

### Pre-Launch

- [ ] Leaked Password Protection ingeschakeld
- [ ] Admin accounts hebben MFA
- [ ] Service role key niet in frontend/logs
- [ ] DPIA uitgevoerd (of gedocumenteerd waarom niet nodig)
- [ ] DPA's getekend (Supabase, OpenAI)
- [ ] Privacy policy up-to-date met subverwerkers
- [ ] Consent flows getest

### Monitoring

- [ ] Auth failure spikes alerting
- [ ] Rate limit hits monitoring
- [ ] Error rate monitoring
- [ ] Database connection monitoring

### Incident Response

- [ ] Intern draaiboek beschikbaar
- [ ] Contactpersoon data protection
- [ ] Template voor AP melding (72 uur)
- [ ] Template voor user notification

### Periodieke Review

- [ ] Kwartaal: Audit log retention evalueren
- [ ] Kwartaal: Subverwerkers lijst actualiseren
- [ ] Jaarlijks: Consent versies verhogen indien policy wijzigt
- [ ] Jaarlijks: DPIA review

---

## Versiegeschiedenis

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| 2.2 | 2026-01-04 | FORCE RLS, storage cleanup, consent withdrawal, allowlist AI |
| 2.1 | 2026-01-04 | Storage in export |
| 2.0 | 2026-01-04 | SECURITY INVOKER views, storage policies |
| 1.0 | 2025-xx-xx | Initiële implementatie |

---

## Contact

Voor vragen over deze documentatie of security issues:
- Security: [security contact]
- Privacy: [DPO contact]
- Support: support@perimenopauzeplan.nl
