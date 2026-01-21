import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Basic resource structure for now
const resources = {
  en: {
    common: {
      title: "RT Community Tools",
      dashboard: "Maps",
      tables: "Tables",
      analysis: "Analysis",
      calculator: "Calculator",
      leaderboard: "Leaderboard",
      editor: "Editor",
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
    },
    leaderboard: {
      searchPlaceholder: "Search player...",
      rank: "#",
      player: "Player",
      oldPP: "Official PP",
      newPP: "Rework PP",
      delta: "Change",
      acc: "Accuracy",
      pc: "Playcount"
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