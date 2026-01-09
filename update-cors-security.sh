#!/bin/bash

# Script to update all edge functions with secure CORS
# Run this after reviewing the changes

FUNCTIONS=(
  "cycle-coach"
  "premium-insights"
  "admin-broadcast"
  "voice-to-text"
  "generate-recipes"
  "generate-recipe-image"
  "send-contact-email"
  "nutrition-coach"
  "daily-analysis"
  "weekly-nutrition-insight"
  "monthly-analysis"
  "generate-meditation-audio"
)

for func in "${FUNCTIONS[@]}"; do
  FILE="supabase/functions/$func/index.ts"

  if [ ! -f "$FILE" ]; then
    echo "⚠️  Skipping $func - file not found"
    continue
  fi

  echo "📝 Updating $func..."

  # Check if already updated
  if grep -q "getCorsHeaders" "$FILE"; then
    echo "✅ $func already updated"
    continue
  fi

  # Backup
  cp "$FILE" "$FILE.backup"

  # Add import if not present
  if ! grep -q "cors.ts" "$FILE"; then
    # Find the last import line
    LAST_IMPORT=$(grep -n "^import" "$FILE" | tail -1 | cut -d: -f1)

    if [ -n "$LAST_IMPORT" ]; then
      # Add cors import after last import
      sed -i "${LAST_IMPORT}a import { getCorsHeaders, handleCorsPreflightRequest } from \"../_shared/cors.ts\";" "$FILE"
      echo "  ✓ Added cors import"
    fi
  fi

  # Remove old corsHeaders constant
  sed -i '/^const corsHeaders = {$/,/^};$/d' "$FILE"
  echo "  ✓ Removed old CORS config"

  # Update serve function
  # This is a simple replacement - manual review recommended
  if grep -q "serve(async (req) => {" "$FILE"; then
    sed -i "s/serve(async (req) => {/serve(async (req) => {\n  const corsHeaders = getCorsHeaders(req.headers.get('origin'));\n/" "$FILE"
    echo "  ✓ Added dynamic CORS headers"
  fi

  # Update OPTIONS handling
  sed -i "s/return new Response(null, { headers: corsHeaders });/return handleCorsPreflightRequest(req);/" "$FILE"
  echo "  ✓ Updated OPTIONS handler"

  echo "✅ $func updated - backup saved to $FILE.backup"
done

echo ""
echo "🎉 All functions updated!"
echo ""
echo "⚠️  IMPORTANT: Review changes before deploying:"
echo "   git diff supabase/functions/"
echo ""
echo "📝 TODO: Update Supabase secrets:"
echo "   supabase secrets set ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com"
echo ""
echo "   supabase secrets set MOLLIE_WEBHOOK_SECRET=your_webhook_secret_from_mollie"
