import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    common: {
      title: "RT Community Tools",
      dashboard: "Maps",
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
      
      // Tabs
      tabRework: "Rework PP",
      tabRS: "Rhythm Score",
      
      // Headers
      colPP: "Rework PP",
      colRS: "Rhythm Score",
      
      // Metrics
      acc: "Accuracy",
      pc: "Playcount",
      rr: "RR",
      rs: "RS",
      
      // Expanded View
      topPlays: "Top Performance Records",
      live: "Live",
      recalc: "Rework"
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