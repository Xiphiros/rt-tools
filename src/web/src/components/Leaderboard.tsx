import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayerProfile } from '../types';
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
    faGlobe
} from '@fortawesome/free-solid-svg-icons';

type SystemType = 'official' | 'rework';

export const Leaderboard = () => {
    const { t } = useTranslation('leaderboard');
    const [data, setData] = useState<PlayerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [system, setSystem] = useState<SystemType>('rework');
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    useEffect(() => {
        // Reset to page 1 on search or system change
        setCurrentPage(1);
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
                console.error("Failed to load leaderboard:", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const toggleRow = (userId: string) => {
        if (expandedUser === userId) setExpandedUser(null);
        else setExpandedUser(userId);
    };

    // Sort data based on active system
    const sortedData = [...data].sort((a, b) => {
        if (system === 'official') {
            return b.officialPP - a.officialPP;
        }
        return b.reworkRating - a.reworkRating;
    });

    const filteredData = sortedData.filter(p => 
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

    const getCountryFlag = (code: string) => {
        if (!code) return <FontAwesomeIcon icon={faGlobe} className="text-muted" />;
        return code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
    }

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-64 text-muted animate-pulse">
            <FontAwesomeIcon icon={faSpinner} spin className="text-3xl mb-4 text-primary" /> 
            <span className="font-medium">Loading Data...</span>
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
            <div className="flex gap-4 items-center">
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
                
                {/* System Toggle */}
                <div className="bg-input border border-border rounded-lg p-1 flex">
                    <button
                        onClick={() => setSystem('official')}
                        className={`px-4 py-2 text-xs font-bold rounded transition-all ${
                            system === 'official' 
                            ? 'bg-card text-white shadow-sm ring-1 ring-white/10' 
                            : 'text-muted hover:text-white'
                        }`}
                    >
                        Official PP
                    </button>
                    <button
                        onClick={() => setSystem('rework')}
                        className={`px-4 py-2 text-xs font-bold rounded transition-all ${
                            system === 'rework' 
                            ? 'bg-primary text-black shadow-sm' 
                            : 'text-muted hover:text-white'
                        }`}
                    >
                        Rhythm Rating
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
                                
                                {system === 'official' ? (
                                    <th className="px-6 py-4 text-right text-white">Total PP</th>
                                ) : (
                                    <>
                                        <th className="px-6 py-4 text-right text-muted">Raw PP</th>
                                        <th className="px-6 py-4 text-right text-primary">Rating</th>
                                    </>
                                )}
                                
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted">No players found.</td>
                                </tr>
                            ) : (
                                paginatedData.map((player, index) => {
                                    const displayRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                                    return (
                                    <React.Fragment key={player.userId}>
                                        <tr 
                                            className={`hover:bg-card-hover/50 transition-colors cursor-pointer ${expandedUser === player.userId ? 'bg-card-hover/30' : ''}`}
                                            onClick={() => toggleRow(player.userId)}
                                        >
                                            <td className="px-6 py-4 text-center font-mono text-muted">{displayRank}</td>
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
                                                        <span className="text-xs text-muted flex items-center gap-1">
                                                            {getCountryFlag(player.country)} {player.country}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-muted hidden sm:table-cell">{player.accuracy.toFixed(2)}%</td>
                                            <td className="px-6 py-4 text-right font-mono text-muted hidden md:table-cell">{player.playCount.toLocaleString()}</td>
                                            
                                            {system === 'official' ? (
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-lg font-bold text-white">{player.officialPP.toFixed(0)}</span>
                                                    <span className="text-xs text-muted ml-1">pp</span>
                                                </td>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-4 text-right text-muted font-medium opacity-70">{player.officialPP.toFixed(0)}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">{player.reworkRating.toFixed(2)}</span>
                                                    </td>
                                                </>
                                            )}
                                            
                                            <td className="px-6 py-4 text-center text-muted">
                                                <FontAwesomeIcon icon={expandedUser === player.userId ? faChevronUp : faChevronDown} />
                                            </td>
                                        </tr>
                                        
                                        {/* Expanded Row */}
                                        {expandedUser === player.userId && (
                                            <tr className="bg-input/20">
                                                <td colSpan={system === 'official' ? 6 : 8} className="p-0">
                                                    <div className="p-4 sm:p-6 border-b border-border/50 animate-in slide-in-from-top-2 duration-200">
                                                        <h4 className="text-xs uppercase tracking-widest text-muted font-bold mb-4 flex items-center gap-2">
                                                            <FontAwesomeIcon icon={faTrophy} className="text-warning" /> 
                                                            {system === 'official' ? 'Top Plays' : 'Highest Rated Plays'}
                                                        </h4>
                                                        
                                                        {player.plays && player.plays.length > 0 ? (
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
                                                                            
                                                                            {system === 'official' ? (
                                                                                <div className="text-right">
                                                                                    <span className="text-sm font-bold text-white">{play.oldPP.toFixed(0)}pp</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-right flex flex-col items-end">
                                                                                    <div className="flex items-center gap-1 text-[10px] text-muted uppercase font-bold">
                                                                                        <span>RR</span>
                                                                                        <span className="text-white">{play.rr.toFixed(1)}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-xs text-muted uppercase font-bold tracking-wider">RS</span>
                                                                                        <span className="text-sm font-bold text-primary">{play.rs.toFixed(1)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center text-muted text-sm py-4">No plays available in this mode.</div>
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
                            
                            <div className="hidden sm:flex gap-1">
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