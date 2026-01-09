import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faFolder, 
    faFolderOpen, 
    faExternalLinkAlt, 
    faSearch, 
    faSpinner, 
    faExclamationTriangle,
    faLayerGroup,
    faInfoCircle,
    faTable,
    faClock
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

interface TableMetadata {
    lastUpdated: string;
    totalMaps: number;
    totalLevels: number;
}

// Color coding based on difficulty range
const getLevelColor = (level: number) => {
    if (level >= 100) return 'text-gray-400'; // Grandmaster (Black/Onyx)
    if (level >= 81) return 'text-fuchsia-400'; // Master
    if (level >= 61) return 'text-red-500';     // Expert
    if (level >= 41) return 'text-orange-400';  // Advanced
    if (level >= 21) return 'text-yellow-400';  // Intermediate
    if (level >= 11) return 'text-emerald-400'; // Novice
    return 'text-cyan-400';                     // Basic
};

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1oqqpUE_qHv-dNkx6oQYD3Yh11fpe7IV5Dgt6zuqt9fA/edit?usp=sharing";

export const DifficultyTable = () => {
    const [levels, setLevels] = useState<TableLevel[]>([]);
    const [metadata, setMetadata] = useState<TableMetadata | null>(null);
    const [selectedLevelIndex, setSelectedLevelIndex] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch(`./difficulty_table.json?t=${Date.now()}`)
            .then(res => {
                if (res.status === 404) throw new Error("Database file missing (difficulty_table.json).");
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data: any) => {
                // Support both legacy array format and new object format for stability
                if (Array.isArray(data)) {
                    setLevels(data);
                } else if (data.levels && Array.isArray(data.levels)) {
                    setLevels(data.levels);
                    setMetadata(data.metadata);
                } else {
                    throw new Error("Invalid data format");
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load table:", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const formatUtcDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleString('en-GB', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC'
            }) + " UTC";
        } catch {
            return "Unknown Date";
        }
    };

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
                    <p className="mb-2 font-bold text-white">Troubleshooting:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>If you are a user: Please report this to the site administrator.</li>
                        <li>If you are a maintainer: Ensure <code>difficulty_table.json</code> is generated and in the <code>public</code> folder.</li>
                    </ul>
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

    const activeColor = getLevelColor(currentLevel.level);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
            {/* SIDEBAR: Folder Structure */}
            <div className="lg:w-64 flex-shrink-0 flex flex-col gap-4">
                <div className="bg-card border border-border rounded-xl p-1 shadow-lg flex-1 overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-border/50 bg-input/30">
                        <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                            <FontAwesomeIcon icon={faLayerGroup} />
                            Difficulty Levels
                        </span>
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar p-1 space-y-0.5">
                        {levels.map((lvl, idx) => {
                            const isSelected = selectedLevelIndex === idx;
                            const tierColor = getLevelColor(lvl.level);
                            
                            return (
                                <button
                                    key={lvl.level}
                                    onClick={() => setSelectedLevelIndex(idx)}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
                                        isSelected 
                                        ? 'bg-white/10 border border-white/20 shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]' 
                                        : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    <FontAwesomeIcon 
                                        icon={isSelected ? faFolderOpen : faFolder} 
                                        className={isSelected ? tierColor : "text-muted opacity-50"} 
                                    />
                                    <span className={`flex-1 ${isSelected ? 'text-white' : ''}`}>
                                        {lvl.name}
                                    </span>
                                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded text-muted font-mono">
                                        {lvl.maps.length}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT: Map List */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* Disclaimer Banner */}
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-3 items-start">
                        <FontAwesomeIcon icon={faInfoCircle} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-200/80 leading-relaxed">
                            <strong className="text-blue-100 block mb-1">Community Curated Content</strong>
                            Rankings here are estimates and subject to change.
                            <div className="mt-1 opacity-75 text-xs">
                                <span className="text-warning/90 font-bold mr-1">Note:</span> 
                                Data provided here is a snapshot and may lag behind the live source sheet.
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <a 
                            href={SHEET_URL} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                        >
                            <FontAwesomeIcon icon={faTable} />
                            View Source Sheet
                        </a>
                        {metadata && (
                            <div className="text-[10px] text-blue-200/50 font-mono flex items-center gap-1.5" title="Data Generation Time">
                                <FontAwesomeIcon icon={faClock} />
                                Updated: {formatUtcDate(metadata.lastUpdated)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border border-border rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <span className={activeColor}>◆</span> 
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
                                    className="group bg-card hover:bg-card-hover border border-border hover:border-white/20 rounded-xl p-4 transition-all duration-200 shadow-md hover:shadow-xl relative overflow-hidden"
                                >
                                    {/* Deco Elements */}
                                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <FontAwesomeIcon icon={faExternalLinkAlt} className="text-4xl" />
                                    </div>
                                    {/* Hover Color Line */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 bg-current opacity-0 group-hover:opacity-100 transition-opacity ${activeColor}`} />

                                    <div className="flex justify-between items-start gap-4 relative z-10">
                                        <div className="min-w-0 flex-1">
                                            {/* Header: Diff Name */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`${activeColor} text-xs font-bold`}>◆</span>
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
                                                className="w-10 h-10 bg-input group-hover:bg-white/10 border border-border group-hover:border-white/30 rounded-lg flex items-center justify-center text-muted group-hover:text-white transition-all duration-200 shadow-sm"
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