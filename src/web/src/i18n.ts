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
    leaderboard: {
      searchPlaceholder: "Search player...",
      rank: "#",
      player: "Player",
      tabRework: "Rework PP",
      tabRS: "Rhythm Score",
      colPP: "Rework PP",
      colRS: "Rhythm Score",
      acc: "Accuracy",
      pc: "Playcount",
      rr: "RR",
      rs: "RS",
      topPlays: "Top Performance Records",
      live: "Live",
      recalc: "Rework"
    },
    odAnalysis: {
      title: "Official OD Analysis",
      subtitle: "Detailed breakdown of how OD and Accuracy affect the official scoring system",
      sectionBadge: "Official Formula Only",
      tabGlobal: "Global Stats",
      tabInspector: "Map Inspector",
      loadingData: "Loading Official Dataset...",
      chartSR: "Star Rating (Official)",
      chartPP: "PP Potential (100% SS)",
      insightsTitle: "Understanding Precision Value Retention",
      insightsSubtitle: "The official scoring system uses an exponential curve to reward high accuracy.",
      formulaTitle: "The Power-5 Penalty",
      formulaText: "Performance Points (PP) are scaled by accuracy raised to the power of 5. This means that dropping just a few percentage points results in a massive loss of value.",
      exampleTitle: "Practical Example",
      exampleText: "If a 100% (SS) score is worth 100pp, here is what that same play is worth at lower accuracies:",
      globalChartHeader: "Database Scaling Trends",
      globalChartSubheader: "These metrics represent the average (mean) values calculated across every mapset in the ranked section.",
      searchMap: "Search map...",
      metricOD: "OD",
      metricSR: "Official SR",
      metricPP: "Performance Points",
      tableOD: "OD",
      tableSR: "Official SR",
      tablePP: "SS Value",
      tableRet: "Retention",
      mapStatsTitle: "Difficulty Scaling"
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