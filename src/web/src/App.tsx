import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dashboard } from './components/Dashboard';
import { Calculator } from './components/Calculator';
import { Leaderboard } from './components/Leaderboard';
import { Editor } from './editor/Editor';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

const Disclaimer = () => (
    <div className="bg-warning/10 border-b border-warning/20 text-warning px-4 py-2 text-center text-xs font-medium relative z-[60]">
        <div className="container mx-auto flex items-center justify-center gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <span>
                <strong className="uppercase tracking-wide opacity-90">Experimental:</strong> This tool is currently in active development. Features may break or change. Data loss is possible.
            </span>
        </div>
    </div>
);

const Header = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (t: string) => void }) => {
    const { t } = useTranslation('common');
    const tabs = ['dashboard', 'leaderboard', 'calculator', 'editor'];

    return (
        <header className="border-b border-border bg-[var(--color-header-bg)] sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
            <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                {/* Logo Area */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-900/20">
                        <span className="font-bold text-white text-xs tracking-wider">RT</span>
                    </div>
                    <div className="flex flex-col leading-none">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight text-header">
                                {t('title')}
                            </h1>
                            <span className="text-[10px] uppercase font-bold bg-white/10 text-muted px-1.5 py-0.5 rounded border border-white/5 tracking-wider">
                                Unofficial
                            </span>
                        </div>
                    </div>
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
                            {/* Fallback translation */}
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
            // Editor handles its own layout, so we bypass container constraints if needed
            return <Editor />;
          case 'dashboard':
          default: return <Dashboard />;
      }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-cyan-500/20 selection:text-cyan-200">
      <Disclaimer />
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className={`flex-1 ${activeTab === 'editor' ? '' : 'container mx-auto p-6 max-w-7xl'} animate-in fade-in duration-300`}>
        {renderContent()}
      </main>
    </div>
  )
}

export default App