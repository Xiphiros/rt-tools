import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dashboard } from './components/Dashboard';
import { Calculator } from './components/Calculator';
import { Leaderboard } from './components/Leaderboard';
import { Editor } from './editor/Editor'; // Import Editor

const Header = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (t: string) => void }) => {
    const { t } = useTranslation('common');
    // Added 'editor' to tabs
    const tabs = ['dashboard', 'leaderboard', 'calculator', 'editor'];

    return (
        <header className="border-b border-border bg-[var(--color-header-bg)] sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
            <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                {/* Logo Area */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-900/20">
                        <span className="font-bold text-white text-xs tracking-wider">RT</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-header">
                        {t('title')}
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex gap-1 bg-input p-1 rounded-lg border border-border">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => onTabChange(tab)}
                            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 capitalize ${
                                activeTab === tab 
                                ? 'bg-card text-primary shadow-sm ring-1 ring-border' 
                                : 'text-muted hover:text-secondary hover:bg-white/5'
                            }`}
                        >
                            {/* Fallback to tab name if translation missing */}
                            {t(tab) === tab ? tab.charAt(0).toUpperCase() + tab.slice(1) : t(tab)}
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
      switch(activeTab) {
          case 'leaderboard': return <Leaderboard />;
          case 'calculator': return <Calculator />;
          case 'editor': 
            // Editor needs full width, remove container constraints in future cleanup if needed
            return <Editor />;
          case 'dashboard':
          default: return <Dashboard />;
      }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-cyan-500/20 selection:text-cyan-200">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      {/* 
         If Editor is active, we might want to bypass the container padding 
         to give it maximum screen real estate.
      */}
      <main className={`flex-1 ${activeTab === 'editor' ? '' : 'container mx-auto p-6 max-w-7xl'} animate-in fade-in duration-300`}>
        {renderContent()}
      </main>
    </div>
  )
}

export default App