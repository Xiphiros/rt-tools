import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapData } from '../types';

// Mock data for initial render test
const MOCK_DATA: MapData[] = [
    {
        id: '1', title: 'Make a Move', artist: 'Reol', mapper: 'Xiph', diffName: 'Expert', bpm: 180, stars: 12.45,
        stats: { stream: 10.2, jack: 4.5, chord: 3.2, prec: 8.1, ergo: 5.5, disp: 6.0, stam: 9.2 }
    },
    {
        id: '2', title: 'Overmomochi', artist: 'Kizuna AI', mapper: 'Auto', diffName: 'Hyper', bpm: 150, stars: 8.90,
        stats: { stream: 4.2, jack: 8.5, chord: 2.2, prec: 3.1, ergo: 4.5, disp: 7.0, stam: 5.2 }
    }
];

export const Dashboard = () => {
    const { t } = useTranslation('dashboard');
    const [search, setSearch] = useState('');

    const filteredData = MOCK_DATA.filter(m => 
        m.title.toLowerCase().includes(search.toLowerCase()) || 
        m.mapper.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
                <h2 className="text-lg font-semibold text-text-header">Ranked Maps</h2>
                <input 
                    type="text" 
                    placeholder={t('searchPlaceholder')} 
                    className="bg-input-bg border border-border-input rounded-md px-3 py-2 text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted uppercase bg-card-hover">
                        <tr>
                            <th className="px-6 py-3">Map</th>
                            <th className="px-6 py-3">Diff</th>
                            <th className="px-6 py-3">BPM</th>
                            <th className="px-6 py-3 text-right">Stars</th>
                            <th className="px-6 py-3 text-center">Breakdown</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((map) => (
                            <tr key={map.id} className="border-b border-border hover:bg-card-hover transition-colors">
                                <td className="px-6 py-4 font-medium text-text-primary">
                                    <div>{map.title}</div>
                                    <div className="text-xs text-muted">{map.artist} // {map.mapper}</div>
                                </td>
                                <td className="px-6 py-4 text-secondary">{map.diffName}</td>
                                <td className="px-6 py-4 text-secondary">{map.bpm}</td>
                                <td className="px-6 py-4 text-right font-bold text-score">{map.stars.toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-1 justify-center h-2 items-end">
                                        <div title={`Stream: ${map.stats.stream}`} className="w-2 bg-[var(--color-strain-stream)] rounded-t-sm" style={{ height: `${Math.min(100, map.stats.stream * 8)}%` }}></div>
                                        <div title={`Jack: ${map.stats.jack}`} className="w-2 bg-[var(--color-strain-jack)] rounded-t-sm" style={{ height: `${Math.min(100, map.stats.jack * 8)}%` }}></div>
                                        <div title={`Tech: ${map.stats.ergo}`} className="w-2 bg-[var(--color-strain-ergo)] rounded-t-sm" style={{ height: `${Math.min(100, map.stats.ergo * 8)}%` }}></div>
                                        <div title={`Stamina: ${map.stats.stam}`} className="w-2 bg-[var(--color-strain-stam)] rounded-t-sm" style={{ height: `${Math.min(100, map.stats.stam * 8)}%` }}></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};