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
    faUserCircle
} from '@fortawesome/free-solid-svg-icons';

export const Leaderboard = () => {
    const { t } = useTranslation('leaderboard');
    const [data, setData] = useState<PlayerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        // Fetch the generated players.json
        fetch(`./players.json?t=${Date.now()}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status} - Run the recalc script first!`);
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

    const filteredData = data.filter(p => 
        p.username.toLowerCase().includes(search.toLowerCase())
    );

    const renderDelta = (delta: number) => {
        if (Math.abs(delta) < 0.1) return <span className="text-muted text-xs opacity-50"><FontAwesomeIcon icon={faEquals} /></span>;
        
        const isUp = delta > 0;
        const color = isUp ? 'text-primary' : 'text-danger';
        const icon = isUp ? faArrowUp : faArrowDown;
        
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

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 text-muted animate-pulse">
                <FontAwesomeIcon icon={faSpinner} spin className="text-3xl mb-4 text-primary" /> 
                <span className="font-medium">Loading Rework Data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-64 text-danger">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl mb-4" />
                <h3 className="text-lg font-bold">Leaderboard Unavailable</h3>
                <p className="text-sm text-muted mt-2">Please run the recalculation script in your local environment.</p>
                <code className="mt-4 bg-input px-3 py-1 rounded text-xs text-text-secondary">node .local/scripts/recalc_leaderboard.js</code>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search Bar */}
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

            {/* Table */}
            <div className="bg-card rounded-xl border border-border shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-input/50 border-b border-border text-xs uppercase tracking-wider text-muted font-semibold">
                                <th className="px-6 py-4 w-16 text-center">#</th>
                                <th className="px-6 py-4">{t('player')}</th>
                                <th className="px-6 py-4 text-right">{t('acc')}</th>
                                <th className="px-6 py-4 text-right">{t('pc')}</th>
                                <th className="px-6 py-4 text-right text-muted">{t('oldPP')}</th>
                                <th className="px-6 py-4 text-right text-primary">{t('newPP')}</th>
                                <th className="px-6 py-4 w-32 text-right">{t('delta')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted">
                                        No players found matching "{search}"
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((player) => (
                                    <tr key={player.userId} className="hover:bg-card-hover/50 transition-colors group">
                                        <td className="px-6 py-4 text-center font-mono text-muted">
                                            {player.rank}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-input flex-shrink-0 border border-border">
                                                    {player.avatar ? (
                                                        <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-muted">
                                                            <FontAwesomeIcon icon={faUserCircle} className="text-xl" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-text-header group-hover:text-primary transition-colors">
                                                        {player.username}
                                                    </span>
                                                    <span className="text-xs text-muted" title={player.country}>
                                                        {getCountryFlag(player.country)} {player.country}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-muted">
                                            {player.accuracy.toFixed(2)}%
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-muted">
                                            {player.playCount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-muted font-medium opacity-70">
                                            {player.officialPP.toFixed(0)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                                                {player.reworkPP.toFixed(0)}
                                            </span>
                                            <span className="text-xs text-primary/50 ml-1">pp</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end">
                                                {renderDelta(player.delta)}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};