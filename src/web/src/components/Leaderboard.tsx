import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayerProfile, ReworkPlay } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, 
    faSpinner, 
    faExclamationTriangle, 
    faUserCircle,
    faChevronDown,
    faChevronUp,
    faTrophy,
    faChevronLeft,
    faChevronRight,
    faGlobe,
    faPlusCircle,
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';

type SystemType = 'rework' | 'rs';

const GradeBadge = ({ acc }: { acc: number }) => {
    let grade = 'F';
    let style = 'text-red-500 border-red-500/30 bg-red-500/10';

    if (acc >= 99) { grade = 'SS'; style = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10 shadow-[0_0_8px_rgba(250,204,21,0.2)]'; }
    else if (acc >= 95) { grade = 'S'; style = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'; }
    else if (acc >= 90) { grade = 'A'; style = 'text-green-400 border-green-400/30 bg-green-400/10'; }
    else if (acc >= 85) { grade = 'B'; style = 'text-blue-400 border-blue-400/30 bg-blue-400/10'; }
    else if (acc >= 80) { grade = 'C'; style = 'text-purple-400 border-purple-400/30 bg-purple-400/10'; }
    
    return (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${style} transition-all`}>
            {grade}
        </span>
    );
};

export const Leaderboard = () => {
    const { t } = useTranslation('leaderboard');
    const [data, setData] = useState<PlayerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [system, setSystem] = useState<SystemType>('rework');
    const [showFullHistory, setShowFullHistory] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    useEffect(() => {
        setCurrentPage(1);
        setExpandedUser(null);
    }, [search, system]);

    useEffect(() => {
        fetch(`./players.json?t=${Date.now()}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Leaderboard context error:", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            if (system === 'rework') return b.reworkTotalPP - a.reworkTotalPP;
            return b.totalRS - a.totalRS;
        });
    }, [data, system]);

    const filteredData = useMemo(() => {
        return sortedData.filter(p => p.username.toLowerCase().includes(search.toLowerCase()));
    }, [sortedData, search]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const toggleRow = (userId: string) => {
        setExpandedUser(expandedUser === userId ? null : userId);
        setShowFullHistory(false);
    };

    const getCountryFlag = (code: string) => {
        if (!code) return <FontAwesomeIcon icon={faGlobe} className="text-muted" />;
        return code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
    };

    const renderPlays = (plays: ReworkPlay[]) => {
        const displayPlays = [...plays].sort((a, b) => {
            if (system === 'rework') return b.reworkPP - a.reworkPP;
            return b.rs - a.rs;
        });

        const visiblePlays = showFullHistory ? displayPlays.slice(0, 100) : displayPlays.slice(0, 15);

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visiblePlays.map((play, idx) => (
                        <div key={idx} className="bg-card border border-border rounded-lg p-3 flex flex-col gap-2 hover:border-primary/30 transition-all group/play animate-in fade-in duration-200">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-text-header truncate" title={play.songName}>{play.songName}</div>
                                    <div className="text-xs text-secondary truncate" title={play.diffName}>{play.diffName}</div>
                                </div>
                                <GradeBadge acc={play.acc} />
                            </div>
                            
                            <div className="flex items-end justify-between mt-1 border-t border-white/5 pt-2">
                                {/* Mods & Acc */}
                                <div className="flex gap-1 items-center">
                                    {play.mods.map(m => (
                                        <span key={m} className="text-[10px] bg-white/10 px-1.5 rounded text-white font-bold">{m}</span>
                                    ))}
                                    <span className="text-[10px] text-muted font-mono ml-1">{play.acc.toFixed(2)}%</span>
                                </div>
                                
                                {/* Values */}
                                <div className="text-right flex flex-col items-end">
                                    {system === 'rework' ? (
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted">
                                                <span className="line-through decoration-white/30 opacity-60" title="Live API PP">{play.livePP.toFixed(0)}</span>
                                                <FontAwesomeIcon icon={faArrowRight} className="text-[8px] opacity-40" />
                                                <span className="text-white font-bold text-sm group-hover/play:text-primary transition-colors" title="Rework PP">{play.reworkPP.toFixed(0)}pp</span>
                                            </div>
                                            <div className="text-[9px] text-muted opacity-50 font-mono mt-0.5" title="Difficulty Comparison">
                                                SR: {play.liveSR.toFixed(2)} → {play.rr.toFixed(2)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1 text-[9px] text-muted uppercase font-bold">
                                                <span>{t('rr')}</span>
                                                <span className="text-white">{play.rr.toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted uppercase font-bold tracking-wider">{t('rs')}</span>
                                                <span className="text-sm font-bold text-primary">{play.rs.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {displayPlays.length > 15 && !showFullHistory && (
                    <button 
                        onClick={() => setShowFullHistory(true)}
                        className="w-full py-3 border border-dashed border-border rounded-lg text-xs font-bold text-muted hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 bg-white/5"
                    >
                        <FontAwesomeIcon icon={faPlusCircle} />
                        View Full History ({displayPlays.length} Plays)
                    </button>
                )}
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-64 text-muted animate-pulse">
            <FontAwesomeIcon icon={faSpinner} spin className="text-3xl mb-4 text-primary" /> 
            <span className="font-medium">{t('loading')}</span>
        </div>
    );

    if (error) return (
        <div className="flex flex-col justify-center items-center h-64 text-danger">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl mb-4" />
            <h3 className="text-lg font-bold">Leaderboard Error</h3>
            <p className="text-sm text-muted mt-2">{error}</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input 
                        type="text" 
                        placeholder={t('searchPlaceholder')}
                        className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-text-primary placeholder:text-muted/50 shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                
                <div className="bg-input border border-border rounded-lg p-1 flex shadow-inner">
                    <button
                        onClick={() => setSystem('rework')}
                        className={`px-4 py-2 text-xs font-bold rounded transition-all ${system === 'rework' ? 'bg-card text-white shadow-sm ring-1 ring-white/10' : 'text-muted hover:text-white'}`}
                    >
                        {t('tabRework')}
                    </button>
                    <button
                        onClick={() => setSystem('rs')}
                        className={`px-4 py-2 text-xs font-bold rounded transition-all ${system === 'rs' ? 'bg-primary text-black shadow-sm' : 'text-muted hover:text-white'}`}
                    >
                        {t('tabRS')}
                    </button>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-xl overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-input/50 border-b border-border text-xs uppercase tracking-wider text-muted font-semibold">
                                <th className="px-6 py-4 w-16 text-center">#</th>
                                <th className="px-6 py-4">{t('player')}</th>
                                <th className="px-6 py-4 text-right hidden sm:table-cell">{t('acc')}</th>
                                <th className="px-6 py-4 text-right hidden md:table-cell">{t('pc')}</th>
                                
                                {system === 'rework' ? (
                                    <th className="px-6 py-4 text-right text-white">{t('colPP')}</th>
                                ) : (
                                    <>
                                        <th className="px-6 py-4 text-right text-muted">Rework PP</th>
                                        <th className="px-6 py-4 text-right text-primary">{t('colRS')}</th>
                                    </>
                                )}
                                
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted">No records matched your search.</td>
                                </tr>
                            ) : (
                                paginatedData.map((player, index) => {
                                    const displayRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                                    return (
                                    <React.Fragment key={player.userId}>
                                        <tr 
                                            className={`hover:bg-card-hover/50 transition-colors cursor-pointer group ${expandedUser === player.userId ? 'bg-card-hover/30' : ''}`}
                                            onClick={() => toggleRow(player.userId)}
                                        >
                                            <td className="px-6 py-4 text-center font-mono text-muted group-hover:text-primary transition-colors">{displayRank}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-input flex-shrink-0 border border-border shadow-sm">
                                                        {player.avatar ? (
                                                            <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" loading="lazy" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-muted"><FontAwesomeIcon icon={faUserCircle} className="text-xl" /></div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-text-header group-hover:text-primary transition-colors">{player.username}</span>
                                                        <span className="text-xs text-muted flex items-center gap-1">
                                                            {getCountryFlag(player.country)} {player.country}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-muted hidden sm:table-cell">{player.accuracy.toFixed(2)}%</td>
                                            <td className="px-6 py-4 text-right font-mono text-muted hidden md:table-cell">{player.playCount.toLocaleString()}</td>
                                            
                                            {system === 'rework' ? (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-lg font-bold text-white">{player.reworkTotalPP.toFixed(0)}</span>
                                                        <span className="text-[10px] text-muted line-through opacity-50" title="Live API Total">{player.liveTotalPP.toFixed(0)}</span>
                                                    </div>
                                                </td>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-4 text-right text-muted font-medium opacity-50">{player.reworkTotalPP.toFixed(0)}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                                                            {player.totalRS.toFixed(2)}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                            
                                            <td className="px-6 py-4 text-center text-muted">
                                                <FontAwesomeIcon icon={expandedUser === player.userId ? faChevronUp : faChevronDown} className="transition-transform duration-200" />
                                            </td>
                                        </tr>
                                        
                                        {expandedUser === player.userId && (
                                            <tr className="bg-input/20">
                                                <td colSpan={system === 'rework' ? 6 : 7} className="p-0">
                                                    <div className="p-4 sm:p-6 border-b border-border/50 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="flex justify-between items-center mb-6">
                                                            <h4 className="text-xs uppercase tracking-widest text-muted font-bold flex items-center gap-2">
                                                                <FontAwesomeIcon icon={faTrophy} className="text-warning" /> 
                                                                {t('topPlays')}
                                                            </h4>
                                                            <div className="flex gap-4 items-center">
                                                                <div className="text-[10px] text-muted flex items-center gap-1">
                                                                    <span className="w-2 h-2 rounded-full bg-white opacity-20"></span>
                                                                    <span>Live</span>
                                                                </div>
                                                                <div className="text-[10px] text-muted flex items-center gap-1">
                                                                    <span className="w-2 h-2 rounded-full bg-primary opacity-80"></span>
                                                                    <span>Rework</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {player.plays && player.plays.length > 0 ? renderPlays(player.plays) : (
                                                            <div className="text-center text-muted text-sm py-12 bg-black/10 rounded-lg border border-dashed border-border">No performance records found for this profile.</div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="border-t border-border p-4 bg-input/30 flex flex-col sm:flex-row justify-between items-center gap-4 select-none">
                        <div className="text-xs text-muted">
                            Showing <span className="text-white font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-white font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> of <span className="text-white font-bold">{filteredData.length}</span> players
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold text-muted hover:text-white hover:border-primary/50 disabled:opacity-30 disabled:hover:text-muted disabled:hover:border-border transition-all flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} /> Prev
                            </button>
                            
                            <div className="hidden sm:flex gap-1">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    let p = currentPage - 2 + i;
                                    if (currentPage < 3) p = 1 + i;
                                    if (currentPage > totalPages - 2) p = totalPages - 4 + i;
                                    if (p > 0 && p <= totalPages) {
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${currentPage === p ? 'bg-primary text-black' : 'bg-card border border-border text-muted hover:text-white hover:border-white/20'}`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    }
                                    return null;
                                })}
                            </div>

                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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