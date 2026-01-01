import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Calculator } from './components/Calculator';

const Header = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (t: string) => void }) => {
    return (
        <header className="border-b border-border bg-[var(--color-header-bg)] sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
            <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                {/* Logo Area */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-900/20">
                        <span className="font-bold text-white text-xs tracking-wider">RT</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-header">
                        RT Tools
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex gap-1 bg-input p-1 rounded-lg border border-border">
                    {['Dashboard', 'Calculator'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => onTabChange(tab)}
                            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                activeTab === tab 
                                ? 'bg-card text-primary shadow-sm ring-1 ring-border' 
                                : 'text-muted hover:text-secondary hover:bg-white/5'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );
};

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-cyan-500/20 selection:text-cyan-200">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 container mx-auto p-6 max-w-7xl animate-in fade-in duration-300">
        {activeTab === 'Dashboard' ? <Dashboard /> : <Calculator />}
      </main>
    </div>
  )
}

export default App