import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dashboard } from './components/Dashboard';
import { Calculator } from './components/Calculator';

const Header = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (t: string) => void }) => {
    const { t } = useTranslation('common');
    return (
        <header className="border-b border-border bg-card p-4 sticky top-0 z-50 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-md shadow-lg flex items-center justify-center text-white font-bold text-xs">
                        RT
                    </div>
                    <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                        {t('title')}
                    </h1>
                </div>
                <nav className="flex gap-1 bg-input-bg p-1 rounded-lg border border-border">
                    {['dashboard', 'calculator'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => onTabChange(tab)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                activeTab === tab 
                                ? 'bg-card-hover text-primary shadow-sm' 
                                : 'text-muted hover:text-secondary'
                            }`}
                        >
                            {t(tab)}
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-cyan-500/30">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl animate-fade-in">
        {activeTab === 'dashboard' ? <Dashboard /> : <Calculator />}
      </main>
    </div>
  )
}

export default App