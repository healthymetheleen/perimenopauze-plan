import { useState, useEffect } from 'react';

interface RecipePreferences {
  autoSeasonEnabled: boolean;
  autoCycleEnabled: boolean;
  savedAllergyTags: string[];
}

const STORAGE_KEY = 'recipe-preferences';

const defaultPreferences: RecipePreferences = {
  autoSeasonEnabled: true,
  autoCycleEnabled: true,
  savedAllergyTags: [],
};

export function useRecipePreferences() {
  const [preferences, setPreferences] = useState<RecipePreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load recipe preferences:', e);
    }
    return defaultPreferences;
  });

  // Persist to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error('Failed to save recipe preferences:', e);
    }
  }, [preferences]);

  const setAutoSeasonEnabled = (enabled: boolean) => {
    setPreferences(prev => ({ ...prev, autoSeasonEnabled: enabled }));
  };

  const setAutoCycleEnabled = (enabled: boolean) => {
    setPreferences(prev => ({ ...prev, autoCycleEnabled: enabled }));
  };

  const setSavedAllergyTags = (tags: string[]) => {
    setPreferences(prev => ({ ...prev, savedAllergyTags: tags }));
  };

  const toggleAllergyTag = (tag: string) => {
    setPreferences(prev => ({
      ...prev,
      savedAllergyTags: prev.savedAllergyTags.includes(tag)
        ? prev.savedAllergyTags.filter(t => t !== tag)
        : [...prev.savedAllergyTags, tag],
    }));
  };

  return {
    ...preferences,
    setAutoSeasonEnabled,
    setAutoCycleEnabled,
    setSavedAllergyTags,
    toggleAllergyTag,
  };
}
