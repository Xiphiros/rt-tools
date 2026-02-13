import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    common: {
      title: "RT Community Tools",
      dashboard: "Maps",
      analysis: "Score Analysis",
      od_analysis: "OD Explorer",
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
    },
    odAnalysis: {
      title: "OD Sensitivity Analysis",
      subtitle: "Analyzing the impact of Overall Difficulty across the ranked section",
      tabGlobal: "Global Statistics",
      tabInspector: "Map Inspector",
      loadingData: "Loading Dataset...",
      chartSR: "SR Inflation",
      chartPP: "PP Curve",
      chartCliff: "Retention Cliff (The 90% Factor)",
      searchMap: "Search map...",
      metricOD: "Overall Difficulty",
      metricSR: "Star Rating",
      metricPP: "Performance Points"
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