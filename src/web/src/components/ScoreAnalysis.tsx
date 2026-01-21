import { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, 
    faSpinner, 
    faExclamationTriangle, 
    faSort, 
    faChartBar,
    faClock
} from '@fortawesome/free-solid-svg-icons';

interface AnalysisEntry {
    id: string;
    mapId: string;
    title: string;
    artist: string;
    mapper: string;
    difficulty: string;
    stars: number;
    noteCount: number;
    maxScoreNomod: number;
    maxScoreDT: number;
    avgScore: number;
    ratio: number;
    playCount: number;
    maxAchieved: number;
}

interface AnalysisData {
    metadata: {
        lastUpdated: string;
        totalMaps: number;
        totalDiffs: number;
    };
    data: AnalysisEntry[];
}

type SortKey = 'stars' | 'ratio' | 'playCount' | 'noteCount';

export const ScoreAnalysis = () => {
    const [data, setData] = useState<AnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('stars');
    const [sortDesc, setSortDesc] = useState(true);

    useEffect(() => {
        fetch('./score_analysis.json?t=' + Date.now())
            .then(res => {
                if (res.status === 404) throw new Error("Analysis data not found. Please run the analysis script.");
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load analysis:", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDesc(!sortDesc);
        } else {
            setSortKey(key);
            setSortDesc(true);
        }
    };

    const filteredData = useMemo(() => {
        if (!data) return [];
        
        let result = data.data.filter(item => 
            item.title.toLowerCase().includes(search.toLowerCase()) ||
            item.artist.toLowerCase().includes(search.toLowerCase()) ||
            item.mapper.toLowerCase().includes(search.toLowerCase())
        );

        return result.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            return sortDesc ? valB - valA : valA - valB;
        });
    }, [data, search, sortKey, sortDesc]);

    const getRatioColor = (ratio: number) => {
        if (ratio >= 1.0) return 'text-blue-400';    // Perfect/DT
        if (ratio >= 0.98) return 'text-purple-400'; // S+
        if (ratio >= 0.95) return 'text-cyan-400';   // S
        if (ratio >= 0.90) return 'text-emerald-400'; // A
        if (ratio >= 0.85) return 'text-yellow-400'; // B
        return 'text-red-500';                       // C/D/F
    };

    const formatNumber = (num: number) => num.toLocaleString();

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 text-muted animate-pulse">
                <FontAwesomeIcon icon={faSpinner} spin className="text-3xl mb-4 text-primary" /> 
                <span className="font-medium">Loading Analysis Data...</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col justify-center items-center h-64 text-danger">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl mb-4" />
                <h3 className="text-lg font-bold">Analysis Unavailable</h3>
                <p className="text-sm text-muted mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                        <FontAwesomeIcon icon={faChartBar} />
                    </div>
                    <div>
                        <div className="text-xs text-muted font-bold uppercase tracking-wider">Total Difficulties</div>
                        <div className="text-xl font-bold text-white">{data.metadata.totalDiffs}</div>
                    </div>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary">
                        <FontAwesomeIcon icon={faClock} />
                    </div>
                    <div>
                        <div className="text-xs text-muted font-bold uppercase tracking-wider">Last Updated</div>
                        <div className="text-sm font-bold text-white">
                            {new Date(data.metadata.lastUpdated).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input 
                        type="text" 
                        placeholder="Search maps..." 
                        className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-text-primary placeholder:text-muted/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-input/50 border-b border-border text-xs uppercase tracking-wider text-muted font-semibold">
                                <th className="px-6 py-4">Beatmap</th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('stars')}>
                                    Stars <FontAwesomeIcon icon={faSort} className={`ml-1 ${sortKey === 'stars' ? 'opacity-100' : 'opacity-30'}`} />
                                </th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('noteCount')}>
                                    Notes <FontAwesomeIcon icon={faSort} className={`ml-1 ${sortKey === 'noteCount' ? 'opacity-100' : 'opacity-30'}`} />
                                </th>
                                <th className="px-6 py-4 text-right">Max Score (NM)</th>
                                <th className="px-6 py-4 text-right">Max Score (DT)</th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('playCount')}>
                                    Plays <FontAwesomeIcon icon={faSort} className={`ml-1 ${sortKey === 'playCount' ? 'opacity-100' : 'opacity-30'}`} />
                                </th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('ratio')}>
                                    Avg Score (Top 50) <FontAwesomeIcon icon={faSort} className={`ml-1 ${sortKey === 'ratio' ? 'opacity-100' : 'opacity-30'}`} />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredData.slice(0, 100).map((row) => (
                                <tr key={row.id} className="hover:bg-card-hover/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-text-header truncate max-w-[300px]" title={row.title}>
                                            {row.title}
                                        </div>
                                        <div className="text-xs text-muted mt-0.5 truncate max-w-[300px]">
                                            {row.artist} • <span className="text-secondary">{row.difficulty}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-[var(--color-warning)]">{row.stars.toFixed(2)} ★</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-muted">
                                        {formatNumber(row.noteCount)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-muted">
                                        {formatNumber(row.maxScoreNomod)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-danger/80">
                                        {formatNumber(row.maxScoreDT)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-muted">
                                        {formatNumber(row.playCount)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-white text-base">
                                                {formatNumber(row.avgScore)}
                                            </span>
                                            <span className={`text-[10px] font-bold ${getRatioColor(row.ratio)}`}>
                                                {(row.ratio * 100).toFixed(2)}% of Max
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredData.length > 100 && (
                    <div className="p-4 text-center text-xs text-muted border-t border-border/50">
                        Showing top 100 results of {filteredData.length}
                    </div>
                )}
            </div>
        </div>
    );
};