import React, { useState } from 'react';
import { MapData } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter } from '@fortawesome/free-solid-svg-icons';

// Mock data (temporary until API integration)
const MOCK_DATA: MapData[] = [
    {
        id: '1', title: 'Make a Move', artist: 'Reol', mapper: 'Xiph', diffName: 'Expert', bpm: 180, stars: 12.45,
        stats: { stream: 10.2, jack: 4.5, chord: 3.2, prec: 8.1, ergo: 5.5, disp: 6.0, stam: 9.2 }
    },
    {
        id: '2', title: 'Overmomochi', artist: 'Kizuna AI', mapper: 'Auto', diffName: 'Hyper', bpm: 150, stars: 8.90,
        stats: { stream: 4.2, jack: 8.5, chord: 2.2, prec: 3.1, ergo: 4.5, disp: 7.0, stam: 5.2 }
    },
    {
        id: '3', title: 'Brain Power', artist: 'NOMA', mapper: 'Unknown', diffName: 'Meme', bpm: 170, stars: 15.20,
        stats: { stream: 14.2, jack: 1.5, chord: 5.2, prec: 4.1, ergo: 9.5, disp: 8.0, stam: 12.2 }
    }
];

export const Dashboard = () => {
    const [search, setSearch] = useState('');

    const filteredData = MOCK_DATA.filter(m => 
        m.title.toLowerCase().includes(search.toLowerCase()) || 
        m.mapper.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input 
                        type="text" 
                        placeholder="Search maps, artists, or mappers..." 
                        className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted/50"
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
                                <th className="px-6 py-4">Map Details</th>
                                <th className="px-6 py-4">Difficulty</th>
                                <th className="px-6 py-4">BPM</th>
                                <th className="px-6 py-4 text-right">Rating</th>
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
                                            <div title={`Stream: ${map.stats.stream}`} className="w-2 bg-[var(--strain-stream)] rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.stream * 6)}%` }} />
                                            <div title={`Jack: ${map.stats.jack}`} className="w-2 bg-[var(--strain-jack)] rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.jack * 6)}%` }} />
                                            <div title={`Chord: ${map.stats.chord}`} className="w-2 bg-[var(--strain-chord)] rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.chord * 6)}%` }} />
                                            <div title={`Tech: ${map.stats.ergo}`} className="w-2 bg-[var(--strain-ergo)] rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.ergo * 6)}%` }} />
                                            <div title={`Stamina: ${map.stats.stam}`} className="w-2 bg-[var(--strain-stam)] rounded-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.min(100, map.stats.stam * 6)}%` }} />
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