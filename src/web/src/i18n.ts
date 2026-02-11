import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Localization Resources
 */
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
      officialTab: "Official PP (Hybrid)",
      reworkTab: "Rhythm Rating",
      officialValue: "Hybrid PP",
      reworkValue: "Rating",
      acc: "Accuracy",
      pc: "Playcount",
      rr: "RR",
      rs: "RS",
      topPlays: "Top Performance Records",
      live: "Live",
      recalc: "Recalc"
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