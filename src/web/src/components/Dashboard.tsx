import { useState, useEffect } from 'react';
import { MapData } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, 
    faSpinner, 
    faSort, 
    faExclamationTriangle, 
    faExternalLinkAlt, 
    faArrowUp, 
    faArrowDown, 
    faEquals,
    faBolt,
    faClock,
    faMusic
} from '@fortawesome/free-solid-svg-icons';

type ModOption = 'NM' | 'DT' | 'HT';

export const Dashboard = () => {
    const [data, setData] = useState<MapData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [sortCol, setSortCol] = useState<'stars' | 'starsOfficial'>('stars');
    const [sortDesc, setSortDesc] = useState(true);
    const [activeMod, setActiveMod] = useState<ModOption>('NM');
    
    useEffect(() => {
        fetch(`./beatmaps.json?t=${Date.now()}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    // Filter duplicates based on ID just in case
                    const unique = Array.from(new Map(data.map(item => [item.id, item])).values());
                    setData(unique as MapData[]);
                } else {
                    throw new Error("Data is not an array");
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load map data:", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const handleSort = (col: 'stars' | 'starsOfficial') => {
        if (sortCol === col) setSortDesc(!sortDesc);
        else {
            setSortCol(col);
            setSortDesc(true);
        }
    };

    const getSR = (map: MapData) => {
        if (activeMod === 'DT') return map.starsDT ?? 0;
        if (activeMod === 'HT') return map.starsHT ?? 0;
        return map.stars;
    };

    const filteredData = data.filter(m => 
        m.title.toLowerCase().includes(search.toLowerCase()) || 
        m.mapper.toLowerCase().includes(search.toLowerCase()) ||
        m.artist.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
        const valA = sortCol === 'stars' ? getSR(a) : a[sortCol];
        const valB = sortCol === 'stars' ? getSR(b) : b[sortCol];
        return sortDesc ? valB - valA : valA - valB;
    });

    const getBarColor = (type: string) => `var(--strain-${type})`;

    const renderDelta = (official: number, rework: number) => {
        // Official SR is usually only NM. Comparing Modded Rework vs Nomod Official isn't very useful,
        // but we show it anyway or maybe hide it if modded?
        // Let's hide delta if modded, as it's apples to oranges.
        if (activeMod !== 'NM') return null;

        const diff = rework - official;
        if (Math.abs(diff) < 0.05) return <span className="text-muted text-xs opacity-50"><FontAwesomeIcon icon={faEquals} /></span>;
        
        const isUp = diff > 0;
        const color = isUp ? 'text-primary' : 'text-danger';
        const icon = isUp ? faArrowUp : faArrowDown;
        
        return (
            <span className={`text-xs font-medium ${color} flex items-center gap-0.5`}>
                {Math.abs(diff).toFixed(2)}
                <FontAwesomeIcon icon={icon} style={{ fontSize: '0.6rem' }} />
            </span>
        );
    };

    const ModButton = ({ mod, icon, label, colorClass }: { mod: ModOption, icon: any, label: string, colorClass: string }) => (
        <button
            onClick={() => setActiveMod(mod)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                activeMod === mod 
                ? `bg-card text-white border-${colorClass} shadow-lg shadow-${colorClass}/20` 
                : 'bg-input border-transparent text-muted hover:text-white hover:bg-white/5'
            }`}
        >
            <FontAwesomeIcon icon={icon} className={activeMod === mod ? `text-${colorClass}` : ''} />
            <span>{label}</span>
        </button>
    );

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 text-muted animate-pulse">
                <FontAwesomeIcon icon={faSpinner} spin className="text-3xl mb-4 text-primary" /> 
                <span className="font-medium">Loading Database...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-64 text-danger">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl mb-4" />
                <h3 className="text-lg font-bold">Failed to load data</h3>
                <p className="text-sm text-muted mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Sticky Controls Header */}
            <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm py-4 border-b border-border -mx-6 px-6 mb-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center max-w-7xl mx-auto">
                    {/* Search */}
                    <div className="relative w-full md:w-96">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input 
                            type="text" 
                            placeholder="Search maps..." 
                            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors text-text-primary placeholder:text-muted/50 shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Mod Selector */}
                    <div className="flex gap-2 bg-input/50 p-1 rounded-xl border border-border/50">
                        <ModButton mod="NM" icon={faMusic} label="Nomod" colorClass="primary" />
                        <ModButton mod="DT" icon={faBolt} label="Double Time" colorClass="danger" />
                        <ModButton mod="HT" icon={faClock} label="Half Time" colorClass="success" />
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-input/50 border-b border-border text-xs uppercase tracking-wider text-muted font-semibold">
                                <th className="px-6 py-4">Map Details</th>
                                <th className="px-6 py-4">Difficulty</th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('starsOfficial')}>
                                    Official ★ <FontAwesomeIcon icon={faSort} className={`ml-1 ${sortCol === 'starsOfficial' ? 'opacity-100' : 'opacity-30'}`} />
                                </th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('stars')}>
                                    {activeMod === 'NM' ? 'Rework ★' : `${activeMod} ★`} <FontAwesomeIcon icon={faSort} className={`ml-1 ${sortCol === 'stars' ? 'opacity-100' : 'opacity-30'}`} />
                                </th>
                                <th className="px-6 py-4 w-64 text-center">Strain Profile</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted">
                                        No maps found matching "{search}"
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((map, index) => {
                                    const currentSR = getSR(map);
                                    
                                    return (
                                        <tr key={`${map.id}_${index}`} className="hover:bg-card-hover/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-semibold text-text-header group-hover:text-primary transition-colors truncate max-w-[250px]">
                                                        {map.title}
                                                    </div>
                                                    {map.link && (
                                                        <a href={map.link} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted mt-0.5 truncate max-w-[250px]">{map.artist} • {map.mapper}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-input border border-border text-secondary max-w-[150px] truncate">
                                                    {map.diffName}
                                                </span>
                                            </td>
                                            
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-base font-semibold text-muted">
                                                    {map.starsOfficial.toFixed(2)}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <div className={`text-lg font-bold ${activeMod === 'DT' ? 'text-danger' : activeMod === 'HT' ? 'text-success' : 'text-[var(--color-warning)]'}`}>
                                                        {currentSR.toFixed(2)}
                                                    </div>
                                                    {renderDelta(map.starsOfficial, currentSR)}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex gap-1 justify-center h-8 items-end bg-input/30 rounded-lg p-1.5 border border-border/30">
                                                    {Object.entries(map.stats).map(([key, val]) => (
                                                        <div 
                                                            key={key}
                                                            title={`${key.toUpperCase()}: ${val.toFixed(2)}`} 
                                                            className="w-2 rounded-sm opacity-80 hover:opacity-100 transition-opacity" 
                                                            style={{ 
                                                                height: `${Math.min(100, val * 4)}%`, 
                                                                backgroundColor: getBarColor(key) 
                                                            }} 
                                                        />
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};