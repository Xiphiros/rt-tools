import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ODGlobalDataset, ODMapsDataset, ODMapsetEntry } from '../types';
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
    faGlobeAmericas, 
    faTable,
    faInfoCircle,
    faSpinner,
    faExclamationTriangle,
    faChevronDown,
    faChevronUp,
    faSearch,
    faMicroscope
} from '@fortawesome/free-solid-svg-icons';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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
    
    const [globalData, setGlobalData] = useState<ODGlobalDataset | null>(null);
    const [mapsData, setMapsData] = useState<ODMapsDataset | null>(null);
    
    const [loadingGlobal, setLoadingGlobal] = useState(true);
    const [loadingMaps, setLoadingMaps] = useState(false);
    const [mapsLoaded, setMapsLoaded] = useState(false);
    
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'global' | 'inspector'>('global');
    const [search, setSearch] = useState('');
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        fetch('./od_global.json')
            .then(res => res.json())
            .then(setGlobalData)
            .catch(e => {
                console.error("Global stats missing", e);
                setError("Global statistics dataset not found.");
            })
            .finally(() => setLoadingGlobal(false));
    }, []);

    useEffect(() => {
        if (activeTab === 'inspector' && !mapsLoaded && !loadingMaps) {
            setLoadingMaps(true);
            fetch('./od_maps.json')
                .then(res => {
                    if (!res.ok) throw new Error("Map dataset not found.");
                    return res.json();
                })
                .then((data) => {
                    setMapsData(data);
                    setMapsLoaded(true);
                })
                .catch(e => setError(e.message))
                .finally(() => setLoadingMaps(false));
        }
    }, [activeTab, mapsLoaded, loadingMaps]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        scales: {
            x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
            y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
        },
        plugins: {
            legend: { labels: { color: '#cbd5e1' } },
            tooltip: { backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: 1 }
        }
    };

    const renderGlobalStats = () => {
        if (!globalData) return null;
        const labels = globalData.globalStats.map(s => s.od.toFixed(1));

        const mainChartData = {
            labels,
            datasets: [
                {
                    label: 'Avg SR',
                    data: globalData.globalStats.map(s => s.avgSR),
                    borderColor: '#38bdf8',
                    yAxisID: 'y',
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: 'Avg PP (SS)',
                    data: globalData.globalStats.map(s => s.avgPP100),
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
                <div className="bg-card border border-border rounded-xl p-6 shadow-xl relative overflow-hidden">
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

                <div className="bg-card border border-border p-6 rounded-xl shadow-xl h-96">
                    <div className="h-full"><Line data={mainChartData} options={dualAxisOptions} /></div>
                </div>
            </div>
        );
    };

    const renderMapMatrix = () => {
        if (loadingMaps) {
            return (
                <div className="flex flex-col justify-center items-center h-96 text-muted animate-pulse">
                    <FontAwesomeIcon icon={faSpinner} spin className="text-4xl mb-4 text-primary" /> 
                    <span className="font-bold tracking-widest uppercase text-xs">Loading Detailed Dataset...</span>
                </div>
            );
        }

        if (!mapsData) return null;

        const filtered = mapsData.filter(m => 
            m.title.toLowerCase().includes(search.toLowerCase()) || 
            m.artist.toLowerCase().includes(search.toLowerCase())
        );

        const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

        const selectedEntry = mapsData.find(m => m.mapsetId === selectedMapId);
        
        let mapChartData = null;
        if (selectedEntry && globalData) {
            mapChartData = {
                labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(v => v.toFixed(1)),
                datasets: [
                    { label: 'PP (SS)', data: selectedEntry.difficulties[0].data.pp100, borderColor: '#fbbf24', borderWidth: 2, tension: 0.1, pointRadius: 0 },
                    { label: 'PP (95%)', data: selectedEntry.difficulties[0].data.pp95, borderColor: '#22d3ee', borderWidth: 2, tension: 0.1, pointRadius: 0, borderDash: [5, 5] },
                    { label: 'SR Scale', data: selectedEntry.difficulties[0].data.sr.map(v => v * 10), borderColor: '#38bdf8', borderWidth: 1, tension: 0.1, pointRadius: 0, fill: true, backgroundColor: 'rgba(56, 189, 248, 0.05)' }
                ]
            };
        }

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                    <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden h-full shadow-lg">
                        <div className="p-4 border-b border-border bg-input/20">
                            <div className="relative">
                                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                <input 
                                    type="text" 
                                    placeholder={t('searchMap')}
                                    className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar p-2 bg-black/20">
                            {paginated.map(set => (
                                <button
                                    key={set.mapsetId}
                                    onClick={() => setSelectedMapId(set.mapsetId)}
                                    className={`w-full text-left px-3 py-2 rounded text-sm transition-all truncate border mb-1 ${selectedMapId === set.mapsetId ? 'bg-primary/10 border-primary/40 text-white' : 'border-transparent text-muted hover:text-white hover:bg-white/5'}`}
                                >
                                    <div className="font-bold truncate">{set.title}</div>
                                    <div className="text-[10px] opacity-60 truncate uppercase">{set.artist}</div>
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
                                <div className="mb-6">
                                    <h2 className="text-xl font-black text-white">{selectedEntry.title}</h2>
                                    <div className="text-xs text-muted mt-1 uppercase">
                                        <span className="text-primary font-bold">{selectedEntry.artist}</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0">
                                    {mapChartData && <Line data={mapChartData} options={chartOptions} />}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-input text-muted font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 w-64">Mapset</th>
                                    <th className="px-4 py-3 w-40">Difficulty</th>
                                    {[0, 5, 8, 9, 10, 11].map(od => <th key={od} className="px-2 py-3 text-center">OD {od}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {paginated.map(set => (
                                    <MapsetRow key={set.mapsetId} mapset={set} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-border flex justify-center gap-2 bg-input/30">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-input border border-border rounded text-white disabled:opacity-30">Prev</button>
                        <span className="px-4 py-1 text-muted text-xs flex items-center">Page {page} of {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-input border border-border rounded text-white disabled:opacity-30">Next</button>
                    </div>
                </div>
            </div>
        );
    };

    if (loadingGlobal) return (
        <div className="flex flex-col justify-center items-center h-96 text-muted animate-pulse">
            <FontAwesomeIcon icon={faSpinner} spin className="text-4xl mb-4 text-primary" /> 
            <span className="font-bold tracking-widest uppercase text-xs">{t('loadingData')}</span>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <FontAwesomeIcon icon={faChartLine} className="text-primary" />
                        {t('title')}
                    </h1>
                    <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
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
                        <FontAwesomeIcon icon={faTable} /> Ranked Dataset
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-danger/10 border border-danger/20 p-4 rounded-lg flex items-center gap-3 text-danger mb-6">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <span className="text-sm font-bold">{error}</span>
                </div>
            )}

            <main>{activeTab === 'global' ? renderGlobalStats() : renderMapMatrix()}</main>
        </div>
    );
};

const MapsetRow = ({ mapset }: { mapset: ODMapsetEntry }) => {
    const [expanded, setExpanded] = useState(true);

    return (
        <>
            <tr className="bg-input/20 border-b border-border/30 hover:bg-input/40 transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <td className="px-4 py-3 font-bold text-white flex items-center gap-2" colSpan={8}>
                    <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="text-xs text-muted" />
                    <div className="truncate max-w-md">{mapset.title}</div>
                    <span className="text-muted font-normal text-[10px] uppercase bg-black/20 px-1.5 rounded">{mapset.artist}</span>
                </td>
            </tr>
            {expanded && mapset.difficulties.map((diff, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors text-muted font-mono">
                    <td className="px-4 py-2 border-r border-border/20"></td>
                    <td className="px-4 py-2 text-white font-medium truncate max-w-xs">{diff.name}</td>
                    {[0, 5, 8, 9, 10, 11].map(od => (
                        <td key={od} className="px-2 py-2 text-center border-l border-border/10">
                            <div className="flex flex-col">
                                <span className={`font-bold ${od >= 10 ? 'text-warning' : 'text-white'}`}>
                                    {diff.data.pp100[od]}pp
                                </span>
                                <span className="text-[9px] opacity-50">{diff.data.sr[od].toFixed(2)}★</span>
                            </div>
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
};