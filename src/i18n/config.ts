import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import nl from './locales/nl.json';
import en from './locales/en.json';

// Custom domain-based language detector
const domainDetector = {
  name: 'domainDetector',
  lookup() {
    const hostname = window.location.hostname;
    
    // Production domains
    if (hostname.includes('perimenopause-plan.com')) return 'en';
    if (hostname.includes('perimenopauzeplan.nl')) return 'nl';
    
    // Development: check localStorage or fallback to nl
    return null; // Let other detectors handle it
  },
  cacheUserLanguage(lng: string) {
    localStorage.setItem('i18nextLng', lng);
  },
};

// Create custom language detector instance
const languageDetector = new LanguageDetector();
languageDetector.addDetector(domainDetector);

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nl },
      en: { translation: en },
    },
    fallbackLng: 'nl',
    supportedLngs: ['nl', 'en'],
    
    // Detection order: domain first, then localStorage, then browser
    detection: {
      order: ['domainDetector', 'localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // React-specific settings
    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },
  });

export default i18n;

// Helper to get current language
export const getCurrentLanguage = () => i18n.language || 'nl';

// Helper to check if English
export const isEnglish = () => getCurrentLanguage() === 'en';

// Helper to get domain for language
export const getDomainForLanguage = (lang: 'nl' | 'en') => {
  if (lang === 'en') return 'https://www.perimenopause-plan.com';
  return 'https://www.perimenopauzeplan.nl';
};
