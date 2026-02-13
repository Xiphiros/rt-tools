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
      title: "OD Impact Analysis",
      subtitle: "Comprehensive evaluation of precision strictness and difficulty inflation",
      sectionBadge: "Ranked Section Data",
      tabGlobal: "Global Stats",
      tabInspector: "Map Inspector",
      loadingData: "Processing Ranked Data...",
      chartSR: "SR Inflation",
      chartPP: "Performance Growth",
      insightsTitle: "Precision Value Retention",
      insightsSubtitle: "Based on the Official Accuracy^5 strictness formula",
      searchMap: "Search map or artist...",
      metricOD: "OD",
      metricSR: "SR",
      metricPP: "PP (SS)",
      tableOD: "OD",
      tableSR: "Avg SR",
      tablePP: "Avg PP",
      tableRet: "Retention",
      mapStatsTitle: "Map Scaling Analysis"
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