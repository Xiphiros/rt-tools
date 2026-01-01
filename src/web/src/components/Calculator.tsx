import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
// In a real monorepo setup, we would import from the workspace package
// import { calculateStrain } from '@rt-tools/sr-calculator';
import { StrainGraph } from './StrainGraph';

export const Calculator = () => {
    const { t } = useTranslation('calculator');
    const [jsonInput, setJsonInput] = useState('');
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleCalculate = () => {
        try {
            setError('');
            const notes = JSON.parse(jsonInput);
            
            // SIMULATION: Calling the logic from Batch 2
            // In reality: const res = calculateStrain(notes, 5, true);
            
            // Mock result for visualization since we can't run the calc in this text block
            const mockPeaks = {
                stream: Array.from({length: 50}, () => Math.random() * 20),
                jack: Array.from({length: 50}, () => Math.random() * 10)
            };
            
            setResult({ total: 15.4, peaks: mockPeaks });

        } catch (e) {
            setError('Invalid JSON format');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-4 text-text-header">Raw Note Data</h3>
                <textarea
                    className="w-full h-64 bg-input-bg border border-border-input rounded-md p-3 text-xs font-mono text-secondary focus:ring-2 focus:ring-accent-primary focus:outline-none resize-none"
                    placeholder={t('inputPlaceholder')}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                />
                <div className="mt-4 flex justify-between items-center">
                    <span className="text-red-500 text-sm">{error}</span>
                    <button 
                        onClick={handleCalculate}
                        className="bg-primary hover:bg-cyan-600 text-white font-medium py-2 px-6 rounded-md transition-colors shadow-lg shadow-cyan-500/20"
                    >
                        {t('calculate')}
                    </button>
                </div>
            </div>

            {/* Results Section */}
            <div className="flex flex-col gap-6">
                <div className="bg-card p-6 rounded-xl border border-border h-full flex flex-col justify-center items-center">
                    {!result ? (
                        <p className="text-muted italic">Waiting for input...</p>
                    ) : (
                        <div className="w-full h-full flex flex-col gap-4">
                            <div className="flex justify-between items-end border-b border-border pb-4">
                                <span className="text-muted">Total Strain</span>
                                <span className="text-4xl font-bold text-score">{result.total.toFixed(2)}★</span>
                            </div>
                            <div className="flex-1 min-h-0">
                                <StrainGraph peaks={result.peaks} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};