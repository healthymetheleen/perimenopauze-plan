# 🔒 Security & GDPR Compliance Documentation

## Perimenopauze Plan App - EU Privacy & Security Audit

**Versie:** 2.0  
**Datum:** 2026-01-04  
**Status:** ✅ Geïmplementeerd

---

## A) Data Classificatie & Bewaartermijnen

### Bijzondere Persoonsgegevens (Art. 9 GDPR - Gezondheidsdata)

| Tabel | Data | Bewaartermijn | Rechtsgrond |
|-------|------|---------------|-------------|
| `meals` | Eetmomenten, voedingswaarden | 12 maanden | Toestemming |
| `symptoms` | Klachten, ernstscores | 12 maanden | Toestemming |
| `bleeding_logs` | Menstruatiedata | 12 maanden | Toestemming |
| `cycle_symptom_logs` | Cyclusklachten | 12 maanden | Toestemming |
| `fertility_signals` | BBT, LH-tests | 12 maanden | Toestemming |
| `sleep_sessions` | Slaapdata | 12 maanden | Toestemming |
| `cycles` | Cyclushistorie | 12 maanden | Toestemming |

### Gewone Persoonsgegevens

| Tabel | Data | Bewaartermijn | Rechtsgrond |
|-------|------|---------------|-------------|
| `profiles` | Displaynaam | Account levensduur | Contract |
| `user_consents` | Toestemmingen | Account levensduur + 5 jaar | Wettelijke plicht |
| `subscriptions` | Abonnementsinfo | Account levensduur | Contract |

### Operationele Metadata

| Tabel | Data | Bewaartermijn |
|-------|------|---------------|
| `ai_usage` | AI-aanroepen (geen inhoud) | 6 maanden |
| `ai_insights_cache` | Gecachete inzichten | 6 maanden |
| `audit_logs` | Admin-acties | 24 maanden |
| `consent_history` | Toestemmingshistorie | 5 jaar na account delete |

---

## B) Row Level Security Policies

### RLS Principe: Default Deny

Alle tabellen hebben RLS enabled. Zonder expliciete policy is geen toegang mogelijk.

### Policy Overzicht per Tabel

#### Gezondheidsdata Tabellen
```sql
-- Patroon voor alle owner_id tabellen:
-- SELECT: auth.uid() = owner_id
-- INSERT: auth.uid() = owner_id  
-- UPDATE: auth.uid() = owner_id
-- DELETE: auth.uid() = owner_id

-- Voorbeeld: meals
CREATE POLICY "meals_select" ON meals FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "meals_insert" ON meals FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "meals_update" ON meals FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "meals_delete" ON meals FOR DELETE USING (auth.uid() = owner_id);
```

**Toegepast op:**
- `meals`, `symptoms`, `daily_context`, `diary_days`
- `bleeding_logs`, `cycle_symptom_logs`, `fertility_signals`
- `cycles`, `cycle_preferences`, `cycle_predictions`
- `sleep_sessions`, `ai_usage`, `ai_insights_cache`

#### Profiles (id = user id)
```sql
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (auth.uid() = id);
```

#### Community (publiek leesbaar, eigen content beheren)
```sql
-- Posts/Comments: iedereen kan lezen
CREATE POLICY "Anyone can view posts" ON community_posts FOR SELECT USING (true);

-- Alleen eigen content bewerken/verwijderen
CREATE POLICY "Users can update own posts" ON community_posts 
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own posts" ON community_posts 
  FOR DELETE USING (auth.uid() = owner_id);
```

#### Admin Tabellen
```sql
-- user_roles: alleen admins kunnen beheren
CREATE POLICY "Admins can manage all roles" ON user_roles FOR ALL 
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- audit_logs: alleen admins kunnen lezen
CREATE POLICY "audit_logs_admin_select" ON audit_logs 
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
```

---

## C) Storage Hardening

### Bucket Configuratie

| Bucket | Publiek | Doel | Policies |
|--------|---------|------|----------|
| `content-images` | ❌ Nee | App content (meditaties, oefeningen) | Admin write, Auth read |
| `user-uploads` | ❌ Nee | Gebruikersuploads | Eigen folder alleen |

### Storage Policies

```sql
-- User uploads: alleen eigen folder (/{user_id}/*)
CREATE POLICY "user_uploads_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Content images: admins beheren, users lezen
CREATE POLICY "content_images_auth_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'content-images' 
  AND auth.uid() IS NOT NULL
);
```

### Signed URLs
Voor tijdelijke toegang tot private bestanden:
```typescript
const { data } = await supabase.storage
  .from('user-uploads')
  .createSignedUrl(`${userId}/image.jpg`, 3600); // 1 uur geldig
```

---

## D) Auth & Toegang

### Configuratie
- ✅ Email confirmatie: Aan (productie) / Auto-confirm (development)
- ✅ Anonieme gebruikers: Uitgeschakeld
- ✅ Password policy: Minimum 8 karakters + HaveIBeenPwned check
- ✅ Service role key: Alleen in Edge Functions

### Rollen
```sql
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

-- Role check functie (SECURITY DEFINER)
CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

**⚠️ Belangrijk:** Rollen NOOIT in profiles of users tabel opslaan!

---

## E) Edge Functions Security

### AI Functions Architectuur

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Client App     │────▶│  Edge Function   │────▶│  OpenAI     │
│  (geen API key) │     │  (rate limited)  │     │  (extern)   │
└─────────────────┘     └──────────────────┘     └─────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │  Supabase DB │
                        │  (RLS actief)│
                        └──────────────┘
```

### Security Maatregelen per Function

| Function | Auth | Rate Limit | Consent Check | PII in Prompt |
|----------|------|------------|---------------|---------------|
| `analyze-meal` | ✅ JWT | 30/dag | ✅ Server-side | ❌ Geen |
| `premium-insights` | ✅ JWT | 30/dag | ✅ Server-side | ❌ Geen |
| `cycle-coach` | ✅ JWT | 30/dag | ✅ Server-side | ❌ Geen |
| `monthly-analysis` | ✅ JWT | 1/maand | ✅ Server-side | ❌ Geen |
| `mollie-payments` | ✅ JWT | - | - | ❌ Geen |

### Geanonimiseerde AI Prompts

```typescript
// ❌ FOUT - bevat PII
const prompt = `Analyseer de maaltijd van ${user.email} op ${date}...`;

// ✅ CORRECT - geanonimiseerd
const prompt = `Analyseer deze maaltijd: ${description}`;

// Context wordt alleen gestuurd als:
// - Gemiddelden (geen specifieke datums)
// - Patronen (geen identificeerbare info)
// - Geen user_id, email, of namen
```

### Audit Logging Pattern
```typescript
// Log zonder gevoelige inhoud
await supabase.from('audit_logs').insert({
  actor_id: user.id,
  action: 'ai_analysis',
  target_type: 'meal',
  metadata: { model: 'gpt-4o-mini', tokens: 500 }
  // GEEN: description, result, of andere inhoud
});
```

---

## F) GDPR Features

### 1. Expliciete Consent Registratie

```typescript
// Consent opslaan met versie en timestamp
await supabase.from('user_consents').upsert({
  owner_id: user.id,
  accepted_terms: true,
  accepted_privacy: true,
  accepted_health_data_processing: true,
  accepted_ai_processing: hasAIConsent,
  consent_version: '1.0',
  terms_version: '1.0',
  privacy_policy_version: '1.0',
  accepted_at: new Date().toISOString()
});

// Consent history bijhouden
await supabase.from('consent_history').insert({
  owner_id: user.id,
  consent_type: 'ai_processing',
  consent_given: true,
  consent_version: '1.0'
});
```

### 2. Data Export (DSAR)

```typescript
// Roep database functie aan
const { data, error } = await supabase
  .rpc('export_user_data_complete', { user_uuid: user.id });

// Download als JSON
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
```

### 3. Account Verwijdering

```typescript
// Cascading delete + community anonimisering
const { data, error } = await supabase
  .rpc('delete_user_data', { user_uuid: user.id });
```

### 4. Data Retention

Automatische cleanup via database functie:
```sql
-- Scheduled via pg_cron of externe scheduler
SELECT cleanup_expired_data();
```

---

## G) Security Test Queries

### RLS Bypass Test Queries

Voer deze queries uit als authenticated user om te verifiëren dat RLS werkt:

```sql
-- ❌ Deze queries moeten GEEN resultaten geven voor andere users

-- Test 1: Probeer andermans maaltijden te lezen
SELECT * FROM meals WHERE owner_id != auth.uid() LIMIT 1;
-- Verwacht: 0 rows

-- Test 2: Probeer andermans symptoms te lezen
SELECT * FROM symptoms WHERE owner_id != auth.uid() LIMIT 1;
-- Verwacht: 0 rows

-- Test 3: Probeer andermans slaapdata te lezen
SELECT * FROM sleep_sessions WHERE owner_id != auth.uid() LIMIT 1;
-- Verwacht: 0 rows

-- Test 4: Probeer andermans cyclusdata te lezen
SELECT * FROM bleeding_logs WHERE owner_id != auth.uid() LIMIT 1;
-- Verwacht: 0 rows

-- Test 5: Probeer data te inserten voor andere user
INSERT INTO meals (owner_id, day_id, source) 
VALUES ('00000000-0000-0000-0000-000000000001', 
        '00000000-0000-0000-0000-000000000002', 'test');
-- Verwacht: ERROR - violates row-level security policy

-- Test 6: Probeer admin rol toe te kennen
INSERT INTO user_roles (user_id, role) 
VALUES (auth.uid(), 'admin');
-- Verwacht: ERROR - violates row-level security policy (tenzij admin)

-- Test 7: Probeer audit logs te lezen (als non-admin)
SELECT * FROM audit_logs LIMIT 1;
-- Verwacht: 0 rows (tenzij admin)
```

### Automated RLS Tests (voor CI/CD)

```typescript
// tests/security/rls.test.ts
import { createClient } from '@supabase/supabase-js';

describe('RLS Security Tests', () => {
  const user1 = createClient(SUPABASE_URL, ANON_KEY, { /* user1 session */ });
  const user2 = createClient(SUPABASE_URL, ANON_KEY, { /* user2 session */ });

  test('User cannot read other users meals', async () => {
    // User1 creates a meal
    const { data: meal } = await user1.from('meals').insert({...}).select().single();
    
    // User2 tries to read it
    const { data, error } = await user2.from('meals').select().eq('id', meal.id);
    
    expect(data).toHaveLength(0);
  });

  test('User cannot update other users data', async () => {
    const { error } = await user2.from('meals')
      .update({ kcal: 9999 })
      .eq('owner_id', user1.id);
    
    expect(error).toBeDefined();
  });

  test('Anonymous user cannot access protected tables', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data } = await anon.from('meals').select();
    expect(data).toHaveLength(0);
  });
});
```

---

## H) Verwerkingsregister Checklist

### Data Processing Agreement (DPA)

| Subverwerker | Dienst | Locatie | DPA Status |
|--------------|--------|---------|------------|
| Supabase | Database, Auth, Storage | EU (Frankfurt) | ✅ Standaard DPA |
| OpenAI | AI analyse | US | ⚠️ Check SCCs |
| Mollie | Betalingen | NL | ✅ EU-gebaseerd |

### DPIA Indicatoren

| Criterium | Aanwezig | Actie |
|-----------|----------|-------|
| Grootschalige verwerking gezondheidsdata | ✅ Ja | DPIA verplicht |
| Systematische monitoring | ❌ Nee | - |
| Gevoelige data (Art. 9) | ✅ Ja | Extra maatregelen |
| Cross-border transfer | ✅ Ja (OpenAI) | SCCs vereist |

### Aanbevolen Acties

1. **DPIA uitvoeren** - Verplicht voor gezondheidsapp
2. **OpenAI DPA ondertekenen** - Controleer SCCs
3. **Privacy verklaring updaten** - Vermeld alle subverwerkers
4. **Data minimalisatie review** - Periodiek checken of alle velden nodig zijn

---

## Versiegeschiedenis

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| 2.0 | 2026-01-04 | Security hardening, SECURITY INVOKER views, storage policies |
| 1.0 | 2025-xx-xx | Initiële implementatie |
