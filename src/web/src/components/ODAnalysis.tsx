import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ODDataset } from '../types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faChartLine, 
    faSearch, 
    faGlobeAmericas, 
    faMicroscope,
    faExclamationTriangle,
    faSpinner,
    faTable,
    faPercentage,
    faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Theoretical retention based on Acc^5
const RETENTION_INSIGHTS = [
    { acc: 99, val: 95.1 },
    { acc: 98, val: 90.4 },
    { acc: 96, val: 81.5 },
    { acc: 95, val: 77.4 },
    { acc: 93, val: 69.6 },
    { acc: 90, val: 59.0 },
    { acc: 85, val: 44.4 },
    { acc: 80, val: 32.8 }
];

export const ODAnalysis = () => {
    const { t } = useTranslation('odAnalysis');
    const [data, setData] = useState<ODDataset | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'global' | 'inspector'>('global');
    
    // Inspector State
    const [search, setSearch] = useState('');
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

    useEffect(() => {
        fetch('./od_stats.json')
            .then(res => {
                if (res.status === 404) throw new Error("Dataset missing. Generate with 'npm run od-dataset'.");
                if (!res.ok) throw new Error("Load failed.");
                return res.json();
            })
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        scales: {
            x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
            y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
        },
        plugins: {
            legend: { labels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' as const } } },
            tooltip: { backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: 1 }
        }
    };

    const renderGlobalStats = () => {
        if (!data) return null;
        const labels = data.globalStats.map(s => s.od.toFixed(1));

        const mainChartData = {
            labels,
            datasets: [
                {
                    label: 'Avg SR',
                    data: data.globalStats.map(s => s.avgSR),
                    borderColor: '#38bdf8',
                    yAxisID: 'y',
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: 'Avg PP (SS)',
                    data: data.globalStats.map(s => s.avgPP100),
                    borderColor: '#fbbf24',
                    yAxisID: 'y1',
                    tension: 0.1,
                    pointRadius: 0
                }
            ]
        };

        const dualAxisOptions = {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: { ...chartOptions.scales.y, position: 'left' as const, title: { display: true, text: 'Star Rating', color: '#38bdf8' } },
                y1: { ...chartOptions.scales.y, position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'Performance Points', color: '#fbbf24' } }
            }
        };

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Insights Summary */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl"><FontAwesomeIcon icon={faPercentage} /></div>
                    <h3 className="text-white font-bold mb-1 flex items-center gap-2">
                        <FontAwesomeIcon icon={faInfoCircle} className="text-primary" />
                        {t('insightsTitle')}
                    </h3>
                    <p className="text-xs text-muted mb-6">{t('insightsSubtitle')}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                        {RETENTION_INSIGHTS.map(item => (
                            <div key={item.acc} className="bg-input/40 border border-border rounded-lg p-3 text-center transition-transform hover:scale-105">
                                <div className="text-[10px] text-muted font-bold uppercase">{item.acc}% Acc</div>
                                <div className={`text-lg font-black ${item.val > 70 ? 'text-success' : item.val > 50 ? 'text-warning' : 'text-danger'}`}>
                                    {item.val.toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Trends */}
                <div className="bg-card border border-border p-6 rounded-xl shadow-xl h-96">
                    <div className="h-full"><Line data={mainChartData} options={dualAxisOptions} /></div>
                </div>

                {/* Exhaustive Table */}
                <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                    <div className="p-4 border-b border-border bg-input/20 flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                        <FontAwesomeIcon icon={faTable} className="text-primary" />
                        Ranked Section Matrix
                    </div>
                    <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 bg-input z-10 shadow-sm">
                                <tr className="text-muted font-bold border-b border-border">
                                    <th className="px-6 py-3">{t('tableOD')}</th>
                                    <th className="px-6 py-3">{t('tableSR')}</th>
                                    <th className="px-6 py-3">{t('tablePP')} (SS)</th>
                                    <th className="px-6 py-3">PP (98%)</th>
                                    <th className="px-6 py-3">PP (95%)</th>
                                    <th className="px-6 py-3">PP (90%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {data.globalStats.map(s => (
                                    <tr key={s.od} className="hover:bg-white/5 transition-colors font-mono">
                                        <td className="px-6 py-2 text-white font-bold">{s.od.toFixed(1)}</td>
                                        <td className="px-6 py-2 text-primary">{s.avgSR.toFixed(3)}</td>
                                        <td className="px-6 py-2 text-warning">{s.avgPP100}</td>
                                        <td className="px-6 py-2 text-muted">{s.avgPP98}</td>
                                        <td className="px-6 py-2 text-muted">{s.avgPP95}</td>
                                        <td className="px-6 py-2 text-muted">{s.avgPP90}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderInspector = () => {
        const filteredMaps = data?.maps.filter(m => 
            m.title.toLowerCase().includes(search.toLowerCase()) || 
            m.artist.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 50) || [];

        const selectedEntry = data?.maps.find(m => m.id === selectedMapId);
        
        let mapChartData = null;
        if (selectedEntry && data) {
            mapChartData = {
                labels: data.metadata.odSteps.map(od => od.toFixed(1)),
                datasets: [
                    { label: 'PP (SS)', data: selectedEntry.data.pp100, borderColor: '#fbbf24', borderWidth: 2, tension: 0.1, pointRadius: 0 },
                    { label: 'PP (95%)', data: selectedEntry.data.pp95, borderColor: '#22d3ee', borderWidth: 2, tension: 0.1, pointRadius: 0, borderDash: [5, 5] },
                    { label: 'SR Scale', data: selectedEntry.data.sr.map(v => v * 10), borderColor: '#38bdf8', borderWidth: 1, tension: 0.1, pointRadius: 0, fill: true, backgroundColor: 'rgba(56, 189, 248, 0.05)' }
                ]
            };
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-14rem)]">
                <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden h-full shadow-lg">
                    <div className="p-4 border-b border-border bg-input/20">
                        <div className="relative">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input 
                                type="text" placeholder={t('searchMap')}
                                className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none text-white"
                                value={search} onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar p-2 space-y-1 bg-black/20">
                        {filteredMaps.map(map => (
                            <button
                                key={map.id} onClick={() => setSelectedMapId(map.id)}
                                className={`w-full text-left px-3 py-2 rounded text-sm transition-all truncate border ${selectedMapId === map.id ? 'bg-primary/10 border-primary/40 text-white' : 'border-transparent text-muted hover:text-white hover:bg-white/5'}`}
                            >
                                <div className="font-bold truncate">{map.title}</div>
                                <div className="text-[10px] opacity-60 truncate uppercase tracking-tighter">{map.artist} • {map.diffName}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 flex flex-col h-full shadow-2xl">
                    {!selectedEntry ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted/30 gap-4">
                            <FontAwesomeIcon icon={faMicroscope} className="text-7xl" />
                            <p className="font-bold uppercase tracking-widest text-xs">Select difficulty to inspect scaling</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8 flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-white leading-tight">{selectedEntry.title}</h2>
                                    <div className="text-sm text-muted mt-1">
                                        <span className="text-primary font-bold">{selectedEntry.artist}</span>
                                        <span className="mx-2 opacity-30">/</span>
                                        <span className="text-secondary">{selectedEntry.diffName}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0">
                                {mapChartData && <Line data={mapChartData} options={chartOptions} />}
                            </div>
                            <div className="mt-8 grid grid-cols-3 gap-4">
                                <div className="bg-input/50 p-4 rounded-lg border border-border text-center">
                                    <div className="text-[10px] text-muted font-bold uppercase mb-1">Base SR (OD 5)</div>
                                    <div className="text-xl font-mono font-bold text-white">{selectedEntry.data.sr[50].toFixed(2)} ★</div>
                                </div>
                                <div className="bg-input/50 p-4 rounded-lg border border-border text-center">
                                    <div className="text-[10px] text-muted font-bold uppercase mb-1">Max SR (OD 11)</div>
                                    <div className="text-xl font-mono font-bold text-white">{selectedEntry.data.sr[110].toFixed(2)} ★</div>
                                </div>
                                <div className="bg-input/50 p-4 rounded-lg border border-border text-center">
                                    <div className="text-[10px] text-muted font-bold uppercase mb-1">PP @ OD 10</div>
                                    <div className="text-xl font-mono font-bold text-warning">{selectedEntry.data.pp100[100]}pp</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-96 text-muted animate-pulse">
            <FontAwesomeIcon icon={faSpinner} spin className="text-4xl mb-4 text-primary" /> 
            <span className="font-bold tracking-widest uppercase text-xs">{t('loadingData')}</span>
        </div>
    );

    if (error) return (
        <div className="flex flex-col justify-center items-center h-96 text-danger">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-5xl mb-4" />
            <p className="font-bold">{error}</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">{t('title')}</h1>
                        <span className="px-2 py-0.5 rounded bg-primary text-background text-[10px] font-black uppercase shadow-lg shadow-primary/20">
                            {t('sectionBadge')}
                        </span>
                    </div>
                    <p className="text-sm text-muted mt-1 font-medium">{t('subtitle')}</p>
                </div>
                
                <div className="bg-input border border-border rounded-xl p-1 flex shadow-inner">
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'global' ? 'bg-card text-white shadow-xl ring-1 ring-white/10' : 'text-muted hover:text-white'}`}
                    >
                        <FontAwesomeIcon icon={faGlobeAmericas} /> {t('tabGlobal')}
                    </button>
                    <button
                        onClick={() => setActiveTab('inspector')}
                        className={`px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'inspector' ? 'bg-card text-white shadow-xl ring-1 ring-white/10' : 'text-muted hover:text-white'}`}
                    >
                        <FontAwesomeIcon icon={faMicroscope} /> {t('tabInspector')}
                    </button>
                </div>
            </div>

            <main>{activeTab === 'global' ? renderGlobalStats() : renderInspector()}</main>
        </div>
    );
};