-- Fix function search path for security
-- Update update_updated_at function
DROP FUNCTION IF EXISTS app.update_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION app.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = app
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON app.profiles FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_preferences_updated_at BEFORE UPDATE ON app.user_preferences FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_diary_days_updated_at BEFORE UPDATE ON app.diary_days FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_meals_updated_at BEFORE UPDATE ON app.meals FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_symptoms_updated_at BEFORE UPDATE ON app.symptoms FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_context_updated_at BEFORE UPDATE ON app.daily_context FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
CREATE TRIGGER trg_notes_updated_at BEFORE UPDATE ON app.notes_private FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();