// Shared i18n utilities for edge functions
export type SupportedLanguage = 'nl' | 'en';

export function getLanguage(lang?: string): SupportedLanguage {
  if (lang === 'en') return 'en';
  return 'nl'; // Default to Dutch
}

// Common translations used across functions
export const commonTranslations = {
  nl: {
    disclaimer: 'Deze inzichten zijn informatief en geen medisch advies.',
    disclaimerFull: 'Deze inzichten zijn informatief en geen medisch advies. Raadpleeg bij klachten altijd een zorgverlener.',
    consentRequired: 'Om AI-inzichten te ontvangen is toestemming nodig.',
    limitExceeded: 'Dagelijkse AI-limiet bereikt. Probeer het morgen opnieuw.',
    rateLimit: 'Te veel verzoeken. Probeer het later opnieuw.',
    serviceError: 'Er ging iets mis. Probeer het later opnieuw.',
    unauthorized: 'Authenticatie vereist',
    seasons: {
      winter: 'winter',
      lente: 'lente',
      zomer: 'zomer',
      herfst: 'herfst',
      unknown: 'onbekend',
    },
    phases: {
      menstruatie: 'menstruatie',
      folliculair: 'folliculair',
      ovulatie: 'ovulatie',
      luteaal: 'luteaal',
      unknown: 'onbekend',
    },
  },
  en: {
    disclaimer: 'These insights are informational and not medical advice.',
    disclaimerFull: 'These insights are informational and not medical advice. Always consult a healthcare provider for any concerns.',
    consentRequired: 'Consent is required to receive AI insights.',
    limitExceeded: 'Daily AI limit reached. Please try again tomorrow.',
    rateLimit: 'Too many requests. Please try again later.',
    serviceError: 'Something went wrong. Please try again later.',
    unauthorized: 'Authentication required',
    seasons: {
      winter: 'winter',
      lente: 'spring',
      zomer: 'summer',
      herfst: 'autumn',
      unknown: 'unknown',
    },
    phases: {
      menstruatie: 'menstruation',
      folliculair: 'follicular',
      ovulatie: 'ovulation',
      luteaal: 'luteal',
      unknown: 'unknown',
    },
  },
};

export function getTranslation(lang: SupportedLanguage) {
  return commonTranslations[lang];
}
