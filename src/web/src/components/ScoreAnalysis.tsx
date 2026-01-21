import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, 
    faSpinner, 
    faExclamationTriangle, 
    faSort, 
    faChartBar,
    faClock,
    faChevronDown,
    faChevronUp,
    faTrophy,
    faPercentage,
    faSkull,
    faFileExcel,
    faChevronLeft,
    faChevronRight
} from '@fortawesome/free-solid-svg-icons';

interface CompactScore {
    rank: number;
    player: string;
    score: number;
    pp: number;
    acc: number;
    combo: number;
    grade: string;
    mods: string[];
    date: string;
}

interface DifficultyStats {
    avgAccuracy: number;
    passRate: number;
    maxCombo: number;
    gradeCounts: Record<string, number>;
    modUsage: Record<string, number>;
}

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
    stats: DifficultyStats | null;
    scores: CompactScore[];
}

interface AnalysisData {
    metadata: {
        lastUpdated: string;
        totalMaps: number;
        totalDiffs: number;
    };
    data: AnalysisEntry[];
}

type SortKey = 'stars' | 'ratio' | 'playCount' | 'noteCount' | 'avgScore';

const GradeBadge = ({ grade }: { grade: string }) => {
    const colors: Record<string, string> = {
        SS: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
        S: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
        A: 'text-green-400 border-green-400/30 bg-green-400/10',
        B: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
        C: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
        D: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
        F: 'text-red-500 border-red-500/30 bg-red-500/10'
    };

    const style = colors[grade] || 'text-gray-400 border-gray-400/30 bg-gray-400/10';

    return (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${style}`}>
            {grade}
        </span>
    );
};

export const ScoreAnalysis = () => {
    const [data, setData] = useState<AnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('stars');
    const [sortDesc, setSortDesc] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

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

    useEffect(() => {
        setCurrentPage(1);
    }, [search, sortKey, sortDesc]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE, 
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleExportExcel = async () => {
        if (!filteredData.length) return;
        setExporting(true);

        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Analysis');

            // Define Columns
            sheet.columns = [
                { header: 'Map ID', key: 'mapId', width: 20 },
                { header: 'Artist', key: 'artist', width: 25 },
                { header: 'Title', key: 'title', width: 35 },
                { header: 'Difficulty', key: 'difficulty', width: 20 },
                { header: 'Mapper', key: 'mapper', width: 15 },
                { header: 'Stars', key: 'stars', width: 10 },
                { header: 'Notes', key: 'noteCount', width: 10 },
                { header: 'Avg Score', key: 'avgScore', width: 15 },
                { header: 'Max (NM)', key: 'maxScoreNomod', width: 15 },
                { header: 'Max (DT)', key: 'maxScoreDT', width: 15 },
                { header: 'Clear Ratio', key: 'ratio', width: 12 },
                { header: 'Plays', key: 'playCount', width: 10 },
                { header: 'Max Combo', key: 'maxCombo', width: 12 },
                { header: 'Pass Rate', key: 'passRate', width: 12 },
                { header: 'Avg Acc', key: 'avgAcc', width: 12 },
            ];

            // Styling Header
            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E293B' } // Slate 800
            };
            sheet.getRow(1).alignment = { horizontal: 'center' };

            // Add Rows
            filteredData.forEach(row => {
                const r = sheet.addRow({
                    mapId: row.mapId,
                    artist: row.artist,
                    title: row.title,
                    difficulty: row.difficulty,
                    mapper: row.mapper,
                    stars: row.stars,
                    noteCount: row.noteCount,
                    avgScore: row.avgScore,
                    maxScoreNomod: row.maxScoreNomod,
                    maxScoreDT: row.maxScoreDT,
                    ratio: row.ratio,
                    playCount: row.playCount,
                    maxCombo: row.stats?.maxCombo || 0,
                    passRate: row.stats?.passRate || 0,
                    avgAcc: (row.stats?.avgAccuracy || 0) / 100
                });

                // Conditional Formatting for Ratio
                const ratioCell = r.getCell('ratio');
                ratioCell.numFmt = '0.00%';
                
                let argb = 'FFFF4444'; // Red (Default/Low)
                if (row.ratio >= 1.0) argb = 'FF60A5FA';      // Blue
                else if (row.ratio >= 0.98) argb = 'FFC084FC'; // Purple
                else if (row.ratio >= 0.95) argb = 'FF22D3EE'; // Cyan
                else if (row.ratio >= 0.90) argb = 'FF34D399'; // Green
                else if (row.ratio >= 0.85) argb = 'FFFACC15'; // Yellow
                
                ratioCell.font = { color: { argb }, bold: true };

                // Number Formatting
                r.getCell('stars').numFmt = '0.00';
                r.getCell('noteCount').numFmt = '#,##0';
                r.getCell('avgScore').numFmt = '#,##0';
                r.getCell('maxScoreNomod').numFmt = '#,##0';
                r.getCell('maxScoreDT').numFmt = '#,##0';
                r.getCell('playCount').numFmt = '#,##0';
                r.getCell('passRate').numFmt = '0.0%';
                r.getCell('avgAcc').numFmt = '0.00%';
            });

            // Generate & Save
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rt_analysis_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } catch (e) {
            console.error("Export failed:", e);
            alert("Failed to export Excel file.");
        } finally {
            setExporting(false);
        }
    };

    const getRatioColor = (ratio: number) => {
        if (ratio >= 1.0) return 'text-blue-400';    
        if (ratio >= 0.98) return 'text-purple-400'; 
        if (ratio >= 0.95) return 'text-cyan-400';   
        if (ratio >= 0.90) return 'text-emerald-400'; 
        if (ratio >= 0.85) return 'text-yellow-400'; 
        return 'text-red-500';                       
    };

    const toggleRow = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
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
        <div className="space-y-6 pb-20">
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

            {/* Search and Export */}
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
                <button 
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className="px-4 py-2 bg-input border border-border rounded-lg text-sm font-bold text-muted hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 disabled:opacity-50"
                    title="Export current view to Excel"
                >
                    {exporting ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faFileExcel} className="text-green-500" />}
                    <span>{exporting ? 'Generating...' : 'Export Excel'}</span>
                </button>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border shadow-xl overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
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
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('avgScore')}>
                                    Avg Score <FontAwesomeIcon icon={faSort} className={`ml-1 ${sortKey === 'avgScore' ? 'opacity-100' : 'opacity-30'}`} />
                                </th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('ratio')}>
                                    Ratio <FontAwesomeIcon icon={faSort} className={`ml-1 ${sortKey === 'ratio' ? 'opacity-100' : 'opacity-30'}`} />
                                </th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-muted">No maps found.</td>
                                </tr>
                            ) : (
                                paginatedData.map((row) => (
                                    <React.Fragment key={row.id}>
                                        <tr 
                                            onClick={() => toggleRow(row.id)}
                                            className={`hover:bg-card-hover/50 transition-colors cursor-pointer ${expandedId === row.id ? 'bg-card-hover/30' : ''}`}
                                        >
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
                                            <td className="px-6 py-4 text-right font-mono text-white font-bold">
                                                {formatNumber(row.avgScore)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-xs font-bold ${getRatioColor(row.ratio)}`}>
                                                        {(row.ratio * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-muted">
                                                <FontAwesomeIcon icon={expandedId === row.id ? faChevronUp : faChevronDown} />
                                            </td>
                                        </tr>

                                        {/* EXPANDED SECTION */}
                                        {expandedId === row.id && (
                                            <tr className="bg-input/20">
                                                <td colSpan={9} className="p-0">
                                                    <div className="p-6 border-b border-border/50 animate-in slide-in-from-top-2 duration-200">
                                                        
                                                        {/* STATS ROW */}
                                                        {row.stats && (
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                                <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                                                                        <FontAwesomeIcon icon={faTrophy} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] text-muted uppercase font-bold">Pass Rate</div>
                                                                        <div className="text-lg font-bold text-white">{(row.stats.passRate * 100).toFixed(1)}%</div>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded bg-secondary/10 text-secondary flex items-center justify-center">
                                                                        <FontAwesomeIcon icon={faPercentage} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] text-muted uppercase font-bold">Avg Accuracy</div>
                                                                        <div className="text-lg font-bold text-white">{row.stats.avgAccuracy.toFixed(2)}%</div>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-card border border-border p-3 rounded-lg flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded bg-danger/10 text-danger flex items-center justify-center">
                                                                        <FontAwesomeIcon icon={faSkull} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] text-muted uppercase font-bold">Max Combo</div>
                                                                        <div className="text-lg font-bold text-white">
                                                                            {row.stats.maxCombo.toLocaleString()} <span className="text-muted text-xs">/ {row.noteCount}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-card border border-border p-3 rounded-lg flex flex-col justify-center">
                                                                    <div className="text-[10px] text-muted uppercase font-bold mb-1">Grade Distribution</div>
                                                                    <div className="flex gap-1">
                                                                        {Object.entries(row.stats.gradeCounts).map(([grade, count]) => (
                                                                            count > 0 && (
                                                                                <span key={grade} className="text-xs" title={`${count} ${grade} ranks`}>
                                                                                    <GradeBadge grade={grade} /> <span className="text-muted ml-0.5">{count}</span>
                                                                                </span>
                                                                            )
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* LEADERBOARD TABLE */}
                                                        <h4 className="text-xs uppercase font-bold text-muted mb-3 tracking-wider">Top 50 Scores Snapshot</h4>
                                                        <div className="overflow-x-auto rounded-lg border border-border">
                                                            <table className="w-full text-xs text-left bg-card">
                                                                <thead className="bg-input/50 text-muted font-semibold">
                                                                    <tr>
                                                                        <th className="px-4 py-2 w-12 text-center">#</th>
                                                                        <th className="px-4 py-2">Player</th>
                                                                        <th className="px-4 py-2 text-right">Score</th>
                                                                        <th className="px-4 py-2 text-right">Accuracy</th>
                                                                        <th className="px-4 py-2 text-right">Combo</th>
                                                                        <th className="px-4 py-2 text-center">Grade</th>
                                                                        <th className="px-4 py-2 text-right">Mods</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-border/50">
                                                                    {row.scores.map((score) => (
                                                                        <tr key={score.rank} className="hover:bg-white/5 transition-colors">
                                                                            <td className="px-4 py-2 text-center text-muted">{score.rank}</td>
                                                                            <td className="px-4 py-2 font-medium text-white">{score.player}</td>
                                                                            <td className="px-4 py-2 text-right font-mono">{score.score.toLocaleString()}</td>
                                                                            <td className="px-4 py-2 text-right text-muted">{score.acc.toFixed(2)}%</td>
                                                                            <td className="px-4 py-2 text-right text-muted">{score.combo}x</td>
                                                                            <td className="px-4 py-2 text-center"><GradeBadge grade={score.grade} /></td>
                                                                            <td className="px-4 py-2 text-right">
                                                                                <div className="flex justify-end gap-1">
                                                                                    {score.mods.map(m => (
                                                                                        <span key={m} className="text-[9px] bg-white/10 px-1 rounded text-white/80">{m}</span>
                                                                                    ))}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                    {row.scores.length === 0 && (
                                                                        <tr><td colSpan={7} className="p-4 text-center text-muted">No scores recorded.</td></tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="border-t border-border p-4 bg-input/30 flex justify-between items-center select-none">
                        <div className="text-xs text-muted">
                            Showing <span className="text-white font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-white font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> of <span className="text-white font-bold">{filteredData.length}</span> maps
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold text-muted hover:text-white hover:border-primary/50 disabled:opacity-30 disabled:hover:text-muted disabled:hover:border-border transition-all flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} /> Prev
                            </button>
                            
                            <div className="flex gap-1">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    let p = currentPage - 2 + i;
                                    if (currentPage < 3) p = 1 + i;
                                    if (currentPage > totalPages - 2) p = totalPages - 4 + i;
                                    
                                    if (p > 0 && p <= totalPages) {
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => handlePageChange(p)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                                    currentPage === p 
                                                    ? 'bg-primary text-black' 
                                                    : 'bg-card border border-border text-muted hover:text-white hover:border-white/20'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    }
                                    return null;
                                })}
                            </div>

                            <button 
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold text-muted hover:text-white hover:border-primary/50 disabled:opacity-30 disabled:hover:text-muted disabled:hover:border-border transition-all flex items-center gap-2"
                            >
                                Next <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};