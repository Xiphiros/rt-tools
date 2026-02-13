import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ODDataset, ODMapEntry } from '../types';
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
    faSpinner
} from '@fortawesome/free-solid-svg-icons';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
                if (res.status === 404) throw new Error("Dataset not found. Run 'npm run od-dataset' first.");
                if (!res.ok) throw new Error("Failed to load dataset");
                return res.json();
            })
            .then(setData)
            .catch(err => {
                console.error(err);
                setError(err.message);
            })
            .finally(() => setLoading(false));
    }, []);

    // --- CHART HELPERS ---
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        scales: {
            x: {
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' }
            },
            y: {
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' }
            }
        },
        plugins: {
            legend: { labels: { color: '#cbd5e1' } },
            tooltip: { 
                backgroundColor: '#1e293b', 
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: '#334155',
                borderWidth: 1
            }
        }
    };

    // --- GLOBAL CHARTS ---
    const renderGlobalCharts = () => {
        if (!data) return null;
        const labels = data.globalStats.map(s => s.od.toFixed(1));

        const srData = {
            labels,
            datasets: [{
                label: 'Average Star Rating',
                data: data.globalStats.map(s => s.avgSR),
                borderColor: '#38bdf8', // Sky
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                tension: 0.1,
                fill: true
            }]
        };

        const ppData = {
            labels,
            datasets: [
                { label: '100% Acc', data: data.globalStats.map(s => s.avgPP100), borderColor: '#fbbf24', backgroundColor: 'transparent', tension: 0.1 },
                { label: '98% Acc', data: data.globalStats.map(s => s.avgPP98), borderColor: '#34d399', backgroundColor: 'transparent', tension: 0.1 },
                { label: '95% Acc', data: data.globalStats.map(s => s.avgPP95), borderColor: '#22d3ee', backgroundColor: 'transparent', tension: 0.1 },
                { label: '90% Acc', data: data.globalStats.map(s => s.avgPP90), borderColor: '#f43f5e', backgroundColor: 'transparent', tension: 0.1 },
            ]
        };

        const cliffData = {
            labels,
            datasets: [
                {
                    label: '90% Accuracy Value Retention',
                    data: data.globalStats.map(s => s.retention90 * 100),
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                },
                {
                    label: '95% Accuracy Value Retention',
                    data: data.globalStats.map(s => s.retention95 * 100),
                    borderColor: '#22d3ee',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    tension: 0.1
                }
            ]
        };

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
                <div className="bg-card border border-border p-4 rounded-xl shadow-lg h-80">
                    <h3 className="text-sm font-bold text-white mb-2">{t('chartPP')}</h3>
                    <div className="h-full pb-6"><Line data={ppData} options={commonOptions} /></div>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl shadow-lg h-80">
                    <h3 className="text-sm font-bold text-white mb-2">{t('chartCliff')}</h3>
                    <div className="h-full pb-6">
                        <Line 
                            data={cliffData} 
                            options={{
                                ...commonOptions,
                                scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, max: 100, ticks: { color: '#94a3b8', callback: (v) => `${v}%` } } }
                            }} 
                        />
                    </div>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl shadow-lg h-80 lg:col-span-2">
                    <h3 className="text-sm font-bold text-white mb-2">{t('chartSR')}</h3>
                    <div className="h-full pb-6"><Line data={srData} options={commonOptions} /></div>
                </div>
            </div>
        );
    };

    // --- INSPECTOR ---
    const filteredMaps = useMemo(() => {
        if (!data || !search) return [];
        return data.maps.filter(m => 
            m.title.toLowerCase().includes(search.toLowerCase()) || 
            m.artist.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 50);
    }, [data, search]);

    const renderInspector = () => {
        const selectedEntry = data?.maps.find(m => m.id === selectedMapId);
        
        // Prepare selected chart data
        let mapChartData = null;
        if (selectedEntry && data) {
            const labels = data.metadata.odSteps.map(od => od.toFixed(1));
            mapChartData = {
                labels,
                datasets: [
                    { label: '100% Acc', data: selectedEntry.data.pp100, borderColor: '#fbbf24', borderWidth: 2, tension: 0.1, pointRadius: 0 },
                    { label: '95% Acc', data: selectedEntry.data.pp95, borderColor: '#22d3ee', borderWidth: 2, tension: 0.1, pointRadius: 0 },
                    { label: '90% Acc', data: selectedEntry.data.pp90, borderColor: '#f43f5e', borderWidth: 2, tension: 0.1, pointRadius: 0 },
                ]
            };
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-14rem)]">
                {/* LIST */}
                <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden h-full">
                    <div className="p-4 border-b border-border bg-input/20">
                        <div className="relative">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input 
                                type="text" 
                                placeholder={t('searchMap')}
                                className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none text-white"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar p-2 space-y-1">
                        {filteredMaps.map(map => (
                            <button
                                key={map.id}
                                onClick={() => setSelectedMapId(map.id)}
                                className={`w-full text-left px-3 py-2 rounded text-sm transition-all truncate ${
                                    selectedMapId === map.id 
                                    ? 'bg-primary/20 text-white border border-primary/30' 
                                    : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <div className="font-bold truncate">{map.title}</div>
                                <div className="text-xs opacity-70 truncate">{map.artist} [{map.diffName}]</div>
                            </button>
                        ))}
                        {filteredMaps.length === 0 && (
                            <div className="text-center text-muted text-xs py-4">
                                {search ? "No maps found." : "Type to search..."}
                            </div>
                        )}
                    </div>
                </div>

                {/* CHART */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 flex flex-col h-full">
                    {!selectedEntry ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted gap-4">
                            <FontAwesomeIcon icon={faChartLine} className="text-6xl opacity-20" />
                            <p>Select a map to view detailed stats</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-white">{selectedEntry.title}</h2>
                                <div className="flex gap-2 text-sm text-muted">
                                    <span className="text-primary font-bold">{selectedEntry.artist}</span>
                                    <span>•</span>
                                    <span className="text-secondary">{selectedEntry.diffName}</span>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0">
                                {mapChartData && <Line data={mapChartData} options={commonOptions} />}
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                                <div className="bg-input/30 p-2 rounded border border-border">
                                    <div className="text-[10px] text-muted uppercase font-bold">Max SR (OD 11)</div>
                                    <div className="text-lg font-mono text-white">{selectedEntry.data.sr[selectedEntry.data.sr.length-1].toFixed(2)} ★</div>
                                </div>
                                <div className="bg-input/30 p-2 rounded border border-border">
                                    <div className="text-[10px] text-muted uppercase font-bold">Max PP (SS)</div>
                                    <div className="text-lg font-mono text-warning">{selectedEntry.data.pp100[selectedEntry.data.pp100.length-1]}pp</div>
                                </div>
                                <div className="bg-input/30 p-2 rounded border border-border">
                                    <div className="text-[10px] text-muted uppercase font-bold">90% Value Retention</div>
                                    <div className="text-lg font-mono text-danger">
                                        {Math.round((selectedEntry.data.pp90[55] / selectedEntry.data.pp100[55]) * 100)}% <span className="text-[10px] opacity-50">@ OD 5.5</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-64 text-muted animate-pulse">
            <FontAwesomeIcon icon={faSpinner} spin className="text-3xl mb-4 text-primary" /> 
            <span className="font-medium">{t('loadingData')}</span>
        </div>
    );

    if (error) return (
        <div className="flex flex-col justify-center items-center h-64 text-danger">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl mb-4" />
            <h3 className="text-lg font-bold">Analysis Failed</h3>
            <p className="text-sm text-muted mt-2">{error}</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FontAwesomeIcon icon={faChartLine} className="text-primary" />
                        {t('title')}
                    </h1>
                    <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
                </div>
                
                <div className="bg-input border border-border rounded-lg p-1 flex">
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`px-4 py-2 text-xs font-bold rounded transition-all flex items-center gap-2 ${activeTab === 'global' ? 'bg-primary text-black shadow-sm' : 'text-muted hover:text-white hover:bg-white/5'}`}
                    >
                        <FontAwesomeIcon icon={faGlobeAmericas} /> {t('tabGlobal')}
                    </button>
                    <button
                        onClick={() => setActiveTab('inspector')}
                        className={`px-4 py-2 text-xs font-bold rounded transition-all flex items-center gap-2 ${activeTab === 'inspector' ? 'bg-primary text-black shadow-sm' : 'text-muted hover:text-white hover:bg-white/5'}`}
                    >
                        <FontAwesomeIcon icon={faMicroscope} /> {t('tabInspector')}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                {activeTab === 'global' ? renderGlobalCharts() : renderInspector()}
            </div>
            
            <div className="text-[10px] text-muted text-center pt-8 border-t border-border/30">
                Dataset Generated: {data ? new Date(data.metadata.generatedAt).toLocaleString() : 'Unknown'} • {data?.metadata.diffCount} Difficulties Indexed
            </div>
        </div>
    );
};