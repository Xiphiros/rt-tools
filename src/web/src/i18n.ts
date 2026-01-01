import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Basic resource structure for now
const resources = {
  en: {
    common: {
      title: "RT Tools",
      dashboard: "Dashboard",
      calculator: "Calculator",
      settings: "Settings",
      loading: "Loading..."
    },
    calculator: {
      calculate: "Calculate Strain",
      inputPlaceholder: "Paste map JSON data here...",
      results: "Results"
    },
    dashboard: {
      searchPlaceholder: "Search maps...",
      filters: "Filters"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;