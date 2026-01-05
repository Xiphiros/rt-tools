import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayerProfile } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, 
    faSpinner, 
    faExclamationTriangle, 
    faArrowUp, 
    faArrowDown, 
    faEquals,
    faUserCircle,
    faChevronDown,
    faChevronUp,
    faTrophy,
    faChevronLeft,
    faChevronRight
} from '@fortawesome/free-solid-svg-icons';

export const Leaderboard = () => {
    const { t } = useTranslation('leaderboard');
    const [data, setData] = useState<PlayerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    useEffect(() => {
        // Reset to page 1 on search
        setCurrentPage(1);
    }, [search]);

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
                console.error("Failed to load leaderboard:", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const toggleRow = (userId: string) => {
        if (expandedUser === userId) setExpandedUser(null);
        else setExpandedUser(userId);
    };

    const filteredData = data.filter(p => 
        p.username.toLowerCase().includes(search.toLowerCase())
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderDelta = (delta: number, minimal = false) => {
        if (Math.abs(delta) < 0.1) return <span className="text-muted text-xs opacity-50"><FontAwesomeIcon icon={faEquals} /></span>;
        
        const isUp = delta > 0;
        const color = isUp ? 'text-primary' : 'text-danger';
        const icon = isUp ? faArrowUp : faArrowDown;
        
        if (minimal) {
            return (
                <span className={`text-xs ${color} font-medium flex items-center gap-1`}>
                    {Math.abs(delta).toFixed(1)} <FontAwesomeIcon icon={icon} style={{ fontSize: '0.6rem' }} />
                </span>
            )
        }

        return (
            <span className={`text-xs font-bold ${color} flex items-center justify-end gap-1 bg-card px-1.5 py-0.5 rounded border border-border/50`}>
                {Math.abs(delta).toFixed(1)}
                <FontAwesomeIcon icon={icon} style={{ fontSize: '0.6rem' }} />
            </span>
        );
    };

    const getCountryFlag = (code: string) => {
        if (!code) return "🌐";
        return code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
    }

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-64 text-muted animate-pulse">
            <FontAwesomeIcon icon={faSpinner} spin className="text-3xl mb-4 text-primary" /> 
            <span className="font-medium">Loading Rework Data...</span>
        </div>
    );

    if (error) return (
        <div className="flex flex-col justify-center items-center h-64 text-danger">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl mb-4" />
            <h3 className="text-lg font-bold">Leaderboard Unavailable</h3>
            <p className="text-sm text-muted mt-2">Please run the recalculation script in your local environment.</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input 
                        type="text" 
                        placeholder={t('searchPlaceholder')}
                        className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-text-primary placeholder:text-muted/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
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
                                <th className="px-6 py-4 text-right text-muted">{t('oldPP')}</th>
                                <th className="px-6 py-4 text-right text-primary">{t('newPP')}</th>
                                <th className="px-6 py-4 w-32 text-right">{t('delta')}</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted">No players found.</td>
                                </tr>
                            ) : (
                                paginatedData.map((player) => (
                                    <React.Fragment key={player.userId}>
                                        <tr 
                                            className={`hover:bg-card-hover/50 transition-colors cursor-pointer ${expandedUser === player.userId ? 'bg-card-hover/30' : ''}`}
                                            onClick={() => toggleRow(player.userId)}
                                        >
                                            <td className="px-6 py-4 text-center font-mono text-muted">{player.rank}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-input flex-shrink-0 border border-border">
                                                        {player.avatar ? (
                                                            <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" loading="lazy" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-muted">
                                                                <FontAwesomeIcon icon={faUserCircle} className="text-xl" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-text-header">{player.username}</span>
                                                        <span className="text-xs text-muted">{getCountryFlag(player.country)} {player.country}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-muted hidden sm:table-cell">{player.accuracy.toFixed(2)}%</td>
                                            <td className="px-6 py-4 text-right font-mono text-muted hidden md:table-cell">{player.playCount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-muted font-medium opacity-70">{player.officialPP.toFixed(0)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">{player.reworkPP.toFixed(0)}</span>
                                                <span className="text-xs text-primary/50 ml-1">pp</span>
                                            </td>
                                            <td className="px-6 py-4"><div className="flex justify-end">{renderDelta(player.delta)}</div></td>
                                            <td className="px-6 py-4 text-center text-muted">
                                                <FontAwesomeIcon icon={expandedUser === player.userId ? faChevronUp : faChevronDown} />
                                            </td>
                                        </tr>
                                        
                                        {/* Expanded Row */}
                                        {expandedUser === player.userId && (
                                            <tr className="bg-input/20">
                                                <td colSpan={8} className="p-0">
                                                    <div className="p-4 sm:p-6 border-b border-border/50 animate-in slide-in-from-top-2 duration-200">
                                                        <h4 className="text-xs uppercase tracking-widest text-muted font-bold mb-4 flex items-center gap-2">
                                                            <FontAwesomeIcon icon={faTrophy} className="text-warning" /> Top Plays Impact
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {player.plays.slice(0, 15).map((play, idx) => (
                                                                <div key={idx} className="bg-card border border-border rounded-lg p-3 flex flex-col gap-2 hover:border-primary/30 transition-colors">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="min-w-0">
                                                                            <div className="text-sm font-semibold text-text-header truncate" title={play.songName}>{play.songName}</div>
                                                                            <div className="text-xs text-secondary truncate" title={play.diffName}>{play.diffName}</div>
                                                                        </div>
                                                                        <div className="text-xs font-mono text-muted bg-input px-1.5 py-0.5 rounded border border-border/50">
                                                                            {play.acc.toFixed(2)}%
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-end justify-between mt-1">
                                                                        <div className="flex gap-1">
                                                                            {play.mods.map(m => (
                                                                                <span key={m} className="text-[10px] bg-white/10 px-1 rounded text-white font-bold">{m}</span>
                                                                            ))}
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="flex items-center gap-2 justify-end">
                                                                                <span className="text-xs text-muted line-through decoration-danger/50">{play.oldPP.toFixed(0)}</span>
                                                                                <span className="text-sm font-bold text-primary">{play.newPP.toFixed(0)}pp</span>
                                                                            </div>
                                                                            <div className="flex justify-end">
                                                                                 {renderDelta(play.newPP - play.oldPP, true)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="mt-4 text-center">
                                                            <span className="text-xs text-muted italic">Showing top 15 of 50 tracked plays</span>
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
                            Showing <span className="text-white font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-white font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> of <span className="text-white font-bold">{filteredData.length}</span> players
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold text-muted hover:text-white hover:border-primary/50 disabled:opacity-30 disabled:hover:text-muted disabled:hover:border-border transition-all flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} /> Prev
                            </button>
                            
                            {/* Simple Page Numbers */}
                            <div className="hidden sm:flex gap-1">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    // Logic to show pages around current
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