# 🛡️ RATE LIMITING VERBETERINGEN

## Huidige Bescherming
✅ DAILY_AI_LIMIT = 30 per user per dag
✅ JWT verificatie ingeschakeld
✅ RLS policies op database

## 🔴 Extra Bescherming Nodig

### 1. IP-Based Rate Limiting (Supabase Level)

**Probleem:** Hacker maakt 100 accounts, elk account = 30 AI calls
**Oplossing:** Limiteer ook op IP adres

```sql
-- Voeg toe aan Supabase migrations:
CREATE TABLE IF NOT EXISTS app.rate_limit_tracker (
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ip_address, endpoint)
);

-- Cleanup oude entries (via cron job)
CREATE OR REPLACE FUNCTION app.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM app.rate_limit_tracker
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
```

**In edge functions:**
```typescript
async function checkIPRateLimit(req: Request, endpoint: string): Promise<boolean> {
  const ip = req.headers.get('x-forwarded-for') ||
              req.headers.get('x-real-ip') ||
              'unknown';

  const { data } = await supabase
    .from('rate_limit_tracker')
    .select('request_count, window_start')
    .eq('ip_address', ip)
    .eq('endpoint', endpoint)
    .single();

  if (data) {
    const hourAgo = new Date(Date.now() - 60*60*1000);
    if (new Date(data.window_start) > hourAgo) {
      if (data.request_count >= 100) { // 100 requests per hour per IP
        return false;
      }
    }
  }

  // Update counter
  await supabase.rpc('increment_rate_limit', {
    p_ip: ip,
    p_endpoint: endpoint
  });

  return true;
}
```

### 2. Email Verificatie Vereist voor Premium Features

**Probleem:** Fake accounts zonder verificatie krijgen AI toegang
**Oplossing:**

```typescript
// In edge functions met AI:
async function requireVerifiedEmail(user: User): Promise<boolean> {
  if (!user.email_confirmed_at) {
    throw new Error('Email verificatie vereist voor AI features');
  }
  return true;
}
```

**In Supabase Auth Settings:**
- Enable: "Email confirmations required"
- Enable: "Double opt-in for email changes"

### 3. Progressive Rate Limiting

**Concept:** Nieuwe accounts krijgen minder, geverifieerde meer

```typescript
function getAILimit(user: User, subscription: string): number {
  const accountAge = Date.now() - new Date(user.created_at).getTime();
  const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);

  if (subscription === 'premium') return 100; // Premium users
  if (!user.email_confirmed_at) return 5;     // Unverified
  if (daysSinceCreation < 1) return 10;       // Day 1
  if (daysSinceCreation < 7) return 20;       // Week 1
  return 30;                                   // Normal
}
```

### 4. Captcha voor Signup (optioneel)

**Bij veel spam accounts:**
```typescript
// In signup flow
import { verifyCaptcha } from './captcha';

async function signup(email, password, captchaToken) {
  const isHuman = await verifyCaptcha(captchaToken);
  if (!isHuman) {
    throw new Error('Captcha verificatie mislukt');
  }
  // ... rest of signup
}
```

## 🟡 Medium Priority

### 5. Detect Suspicious Patterns

```sql
-- Track signup patterns
CREATE TABLE app.signup_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert if > 5 signups from same IP in 1 hour
CREATE OR REPLACE FUNCTION app.detect_signup_spam()
RETURNS TRIGGER AS $$
BEGIN
  DECLARE
    signup_count INT;
  BEGIN
    SELECT COUNT(*) INTO signup_count
    FROM app.signup_audit
    WHERE ip_address = NEW.ip_address
      AND created_at > NOW() - INTERVAL '1 hour';

    IF signup_count > 5 THEN
      -- Log voor admin review
      INSERT INTO app.security_alerts (type, message)
      VALUES ('signup_spam', 'Multiple signups from IP: ' || NEW.ip_address);
    END IF;

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;
```

### 6. Webhook Rate Limiting (al geïmplementeerd! ✅)

Je hebt dit al:
```typescript
// In mollie-security.ts:
export function checkWebhookRateLimit(paymentId: string): boolean {
  // Rate limit: max 10 requests per minute per payment ID
}
```

## 📊 Monitoring & Alerts

### Stel alerts in voor:
1. **Supabase Dashboard → Logs:**
   - Filter op 429 (rate limit) errors
   - Alert als > 100 rate limit hits per uur

2. **Database query:**
```sql
-- Check AI usage per user vandaag
SELECT owner_id, COUNT(*) as ai_calls
FROM app.ai_usage
WHERE created_at > CURRENT_DATE
GROUP BY owner_id
HAVING COUNT(*) > 25
ORDER BY ai_calls DESC;
```

3. **Set up Supabase webhook:**
```typescript
// Alert via email als suspicious activity
if (rateLimitViolations > threshold) {
  await sendEmail(admin, 'Rate limit violation detected');
}
```

## 🚀 Implementatie Prioriteit

**NU (voor live gaan):**
1. ✅ Email verificatie vereisen (Supabase Auth settings)
2. ✅ IP rate limiting toevoegen aan AI functies

**Deze week:**
3. Progressive rate limiting implementeren
4. Signup audit logging

**Optioneel (bij spam problemen):**
5. Captcha toevoegen
6. Advanced pattern detection

## Testing

Test rate limiting:
```bash
# Test AI limit
for i in {1..35}; do
  curl -X POST https://your-project.supabase.co/functions/v1/analyze-meal \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"meal":"test"}'
done
# Verwacht: 30 succeed, 5 fail met 429
```
