import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StrainGraph } from './StrainGraph';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalculator, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

export const Calculator = () => {
    const { t } = useTranslation('calculator');
    const [jsonInput, setJsonInput] = useState('');
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleCalculate = () => {
        try {
            setError('');
            if (!jsonInput.trim()) return;
            
            // Mock Calculation
            const mockPeaks = {
                stream: Array.from({length: 100}, () => Math.random() * 20),
                jack: Array.from({length: 100}, () => Math.random() * 10),
                tech: Array.from({length: 100}, () => Math.random() * 15)
            };
            setResult({ total: (Math.random() * 15 + 5), peaks: mockPeaks });
        } catch (e) {
            setError('Invalid Data');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
            {/* Left Panel: Input */}
            <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="bg-card rounded-xl border border-border p-1 flex-1 flex flex-col shadow-lg">
                    <div className="p-3 border-b border-border/50 bg-input/30 rounded-t-lg flex justify-between items-center">
                        <span className="text-sm font-semibold text-text-secondary pl-2">Map Data (JSON)</span>
                        {error && (
                            <span className="text-xs text-danger flex items-center gap-1">
                                <FontAwesomeIcon icon={faExclamationCircle} /> {error}
                            </span>
                        )}
                    </div>
                    <textarea
                        className="flex-1 w-full bg-transparent p-4 text-xs font-mono text-muted focus:outline-none resize-none placeholder:text-muted/20"
                        placeholder="Paste map data here..."
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        spellCheck={false}
                    />
                    <div className="p-3 border-t border-border/50 bg-input/30 rounded-b-lg">
                        <button 
                            onClick={handleCalculate}
                            className="w-full bg-primary hover:bg-primary-hover text-text-inverted font-bold py-2.5 px-4 rounded-lg transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <FontAwesomeIcon icon={faCalculator} />
                            Calculate Strain
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel: Visualization */}
            <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="bg-card rounded-xl border border-border p-6 h-full shadow-lg flex flex-col relative overflow-hidden">
                    {!result ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted/40 gap-4">
                            <FontAwesomeIcon icon={faCalculator} className="text-6xl mb-2" />
                            <p className="text-sm font-medium">Ready to calculate</p>
                        </div>
                    ) : (
                        <>
                            <div className="absolute top-0 right-0 p-6 text-right z-10">
                                <div className="text-sm text-muted uppercase tracking-widest font-semibold mb-1">Total Rating</div>
                                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[var(--color-warning)] to-orange-500 drop-shadow-sm">
                                    {result.total.toFixed(2)}<span className="text-2xl text-muted ml-1">★</span>
                                </div>
                            </div>
                            <div className="flex-1 mt-8 w-full min-h-0">
                                <StrainGraph peaks={result.peaks} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};