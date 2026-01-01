import React, { useState, useEffect } from 'react';
import { MapData } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faSpinner, faSort } from '@fortawesome/free-solid-svg-icons';

export const Dashboard = () => {
    const [data, setData] = useState<MapData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Fetch data on mount
    useEffect(() => {
        fetch('./beatmaps.json')
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load map data", err);
                setLoading(false);
            });
    }, []);

    const filteredData = data.filter(m => 
        m.title.toLowerCase().includes(search.toLowerCase()) || 
        m.mapper.toLowerCase().includes(search.toLowerCase()) ||
        m.artist.toLowerCase().includes(search.toLowerCase())
    );

    // Color scale helper
    const getBarColor = (val: number, type: string) => {
        // Dynamic intensity could be added here
        return `var(--strain-${type})`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-muted">
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Loading Database...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input 
                        type="text" 
                        placeholder="Search maps, artists, or mappers..." 
                        className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50 text-text-primary"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="px-4 py-2 bg-card border border-border rounded-lg text-muted hover:text-primary hover:border-primary transition-all flex items-center gap-2">
                    <FontAwesomeIcon icon={faFilter} />
                    <span>Filters</span>
                </button>
            </div>

            {/* Table Card */}
            <div className="bg-card rounded-xl border border-border shadow-xl shadow-black/20 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-input/50 border-b border-border text-xs uppercase tracking-wider text-muted font-semibold">
                                <th className="px-6 py-4 cursor-pointer hover:text-primary">Map Details <FontAwesomeIcon icon={faSort} className="ml-1 opacity-30" /></th>
                                <th className="px-6 py-4">Difficulty</th>
                                <th className="px-6 py-4">BPM</th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-primary">Rating <FontAwesomeIcon icon={faSort} className="ml-1 opacity-30" /></th>
                                <th className="px-6 py-4 w-64 text-center">Strain Profile</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredData.map((map) => (
                                <tr key={map.id} className="hover:bg-card-hover/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-text-header group-hover:text-primary transition-colors">{map.title}</div>
                                        <div className="text-xs text-muted mt-0.5">{map.artist} <span className="mx-1 opacity-50">•</span> {map.mapper}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-input border border-border text-secondary">
                                            {map.diffName}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-muted">{map.bpm}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-lg font-bold text-[var(--color-warning)]">{map.stars.toFixed(2)}</span>
                                        <span className="text-xs text-muted ml-1">★</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {/* Mini Strain Bar Chart */}
                                        <div className="flex gap-1 justify-center h-8 items-end bg-input/30 rounded-lg p-1.5 border border-border/30">
                                            <div title={`Stream: ${map.stats.stream.toFixed(2)}`} className="w-2 rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.stream * 4)}%`, backgroundColor: getBarColor(map.stats.stream, 'stream') }} />
                                            <div title={`Jack: ${map.stats.jack.toFixed(2)}`} className="w-2 rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.jack * 4)}%`, backgroundColor: getBarColor(map.stats.jack, 'jack') }} />
                                            <div title={`Chord: ${map.stats.chord.toFixed(2)}`} className="w-2 rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.chord * 4)}%`, backgroundColor: getBarColor(map.stats.chord, 'chord') }} />
                                            <div title={`Prec: ${map.stats.prec.toFixed(2)}`} className="w-2 rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.prec * 4)}%`, backgroundColor: getBarColor(map.stats.prec, 'prec') }} />
                                            <div title={`Ergo: ${map.stats.ergo.toFixed(2)}`} className="w-2 rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.ergo * 4)}%`, backgroundColor: getBarColor(map.stats.ergo, 'ergo') }} />
                                            <div title={`Disp: ${map.stats.disp.toFixed(2)}`} className="w-2 rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.disp * 4)}%`, backgroundColor: getBarColor(map.stats.disp, 'disp') }} />
                                            <div title={`Stam: ${map.stats.stam.toFixed(2)}`} className="w-2 rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.stam * 4)}%`, backgroundColor: getBarColor(map.stats.stam, 'stam') }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};