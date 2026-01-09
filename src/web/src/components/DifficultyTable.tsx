import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faFolder, 
    faFolderOpen, 
    faExternalLinkAlt, 
    faSearch, 
    faSpinner, 
    faExclamationTriangle,
    faLayerGroup
} from '@fortawesome/free-solid-svg-icons';

// Types matching the JSON output from process_tables.js
interface TableMapEntry {
    title: string;
    artist: string;
    mapper: string;
    diffName: string;
    mapsetId: string;
    url: string;
    comment: string;
}

interface TableLevel {
    level: number;
    name: string;
    maps: TableMapEntry[];
}

export const DifficultyTable = () => {
    const [levels, setLevels] = useState<TableLevel[]>([]);
    const [selectedLevelIndex, setSelectedLevelIndex] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch(`./difficulty_table.json?t=${Date.now()}`)
            .then(res => {
                if (res.status === 404) throw new Error("Table data not found. Please run the processing script.");
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data: TableLevel[]) => {
                setLevels(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load table:", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-96 text-muted animate-pulse">
                <FontAwesomeIcon icon={faSpinner} spin className="text-4xl mb-4 text-primary" />
                <span className="font-medium">Loading Difficulty Tables...</span>
            </div>
        );
    }

    if (error || levels.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center h-96 text-danger text-center max-w-lg mx-auto">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-5xl mb-6 opacity-80" />
                <h3 className="text-xl font-bold mb-2">Table Data Unavailable</h3>
                <p className="text-sm text-muted mb-6">
                    {error || "No levels found in the dataset."}
                </p>
                <div className="bg-card border border-border p-4 rounded-lg text-left text-xs text-muted font-mono w-full">
                    <p className="mb-2 font-bold text-white">How to fix:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                        <li>Ensure <span className="text-primary">data/difficulty_table.xlsx</span> exists.</li>
                        <li>Run <span className="text-primary">npm run tables</span> in <span className="text-white">.local/scripts</span>.</li>
                        <li>Reload this page.</li>
                    </ol>
                </div>
            </div>
        );
    }

    const currentLevel = levels[selectedLevelIndex];
    
    // Filter maps within the selected level based on search
    const filteredMaps = currentLevel.maps.filter(m => 
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.artist.toLowerCase().includes(search.toLowerCase()) ||
        m.mapper.toLowerCase().includes(search.toLowerCase()) ||
        m.comment.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
            {/* SIDEBAR: Folder Structure */}
            <div className="lg:w-64 flex-shrink-0 flex flex-col gap-4">
                <div className="bg-card border border-border rounded-xl p-1 shadow-lg flex-1 overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-border/50 bg-input/30">
                        <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                            <FontAwesomeIcon icon={faLayerGroup} />
                            Tiers
                        </span>
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar p-1 space-y-0.5">
                        {levels.map((lvl, idx) => (
                            <button
                                key={lvl.level}
                                onClick={() => setSelectedLevelIndex(idx)}
                                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
                                    selectedLevelIndex === idx 
                                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]' 
                                    : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <FontAwesomeIcon 
                                    icon={selectedLevelIndex === idx ? faFolderOpen : faFolder} 
                                    className={selectedLevelIndex === idx ? "text-primary" : "text-muted opacity-50"} 
                                />
                                <span className="flex-1">{lvl.name}</span>
                                <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded text-muted font-mono">
                                    {lvl.maps.length}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT: Map List */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border border-border rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <span className="text-primary">◆</span> 
                            {currentLevel.name}
                        </h2>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-muted border border-white/5 uppercase tracking-wide">
                            {filteredMaps.length} Charts
                        </span>
                    </div>
                    
                    <div className="relative w-full sm:w-64">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input 
                            type="text" 
                            placeholder="Filter current level..." 
                            className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-primary placeholder:text-muted/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pb-8">
                        {filteredMaps.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-muted italic border-2 border-dashed border-border rounded-xl">
                                No maps match your search in this level.
                            </div>
                        ) : (
                            filteredMaps.map((map, i) => (
                                <div 
                                    key={`${map.mapsetId}-${i}`}
                                    className="group bg-card hover:bg-card-hover border border-border hover:border-primary/50 rounded-xl p-4 transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-primary/5 relative overflow-hidden"
                                >
                                    {/* Deco Elements */}
                                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <FontAwesomeIcon icon={faExternalLinkAlt} className="text-4xl" />
                                    </div>
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex justify-between items-start gap-4 relative z-10">
                                        <div className="min-w-0 flex-1">
                                            {/* Header: Diff Name */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-primary text-xs font-bold">◆</span>
                                                <span className="text-sm font-bold text-secondary uppercase tracking-wide truncate">
                                                    {map.diffName}
                                                </span>
                                            </div>

                                            {/* Title / Artist */}
                                            <h3 className="text-lg font-bold text-white truncate leading-tight mb-0.5" title={map.title}>
                                                {map.title}
                                            </h3>
                                            <p className="text-xs text-muted truncate">
                                                {map.artist} <span className="opacity-30 mx-1">|</span> mapped by <span className="text-text-primary">{map.mapper}</span>
                                            </p>

                                            {/* Comments */}
                                            {map.comment && (
                                                <div className="mt-3 text-xs text-white/70 bg-white/5 border border-white/5 rounded px-2 py-1.5 inline-block">
                                                    {map.comment}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action */}
                                        <div className="flex flex-col gap-2 items-end">
                                            <a 
                                                href={map.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="w-10 h-10 bg-input group-hover:bg-primary group-hover:text-black border border-border group-hover:border-primary rounded-lg flex items-center justify-center text-muted transition-all duration-200 shadow-sm"
                                                title="Open Map Page"
                                            >
                                                <FontAwesomeIcon icon={faExternalLinkAlt} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};