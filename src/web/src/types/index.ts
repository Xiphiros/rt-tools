/**
 * Shared Type Definitions
 */

export interface Note {
    time: number;
    key: string;
    type: 'tap' | 'hold';
    duration?: number;
}

export interface StrainResult {
    total: number;
    details: {
        stream: number;
        jack: number;
        chord: number;
        prec: number;
        ergo: number;
        disp: number;
        stam: number;
    };
    metadata?: {
        drainTime: number;
        firstNoteTime: number;
    };
    peaks?: Record<string, number[]>;
}

export interface MapData {
    id: string;
    title: string;
    artist: string;
    mapper: string;
    diffName: string;
    bpm: number;
    
    // Star Ratings
    stars: number; // Current Rework Nomod Rating (RR)
    starsDT?: number;
    starsHT?: number;
    
    starsOfficial: number; // In-game Star Rating
    stats: StrainResult['details'];
    link?: string | null;
}

export interface ReworkPlay {
    songName: string;
    diffName: string;
    mapper: string;
    
    // 1. Rework PP (New Stars + Standard Formula)
    reworkPP: number; 
    
    // 2. Rhythm Score (Biometric)
    rs: number;         
    rr: number;         // Rhythm Rating
    
    // 3. Live API (Old Stars + Standard Formula)
    livePP: number;   
    liveSR: number;   
    
    acc: number;        
    speed?: number;      
    mods: string[];
    score?: number;      
}

export interface PlayerProfile {
    rank: number;
    userId: string;
    username: string;
    country: string;
    avatar: string | null;
    officialPP: number;    
    reworkRating: number;  
    importTotalPP: number; 
    playCount: number;
    accuracy: number;
    plays: ReworkPlay[]; 
}

// --- OD ANALYSIS DATASETS ---

// 1. Global Stats (0.1 Resolution)
export interface ODGlobalStat {
    od: number;
    avgSR: number;
    avgPP100: number;
    avgPP95: number;
    avgPP90: number;
    retention95: number;
    retention90: number;
}

export interface ODGlobalDataset {
    metadata: {
        generatedAt: string;
        mapCount: number;
        diffCount: number;
    };
    globalStats: ODGlobalStat[];
}

// 2. Map Stats (Integer Resolution, Grouped)
export interface ODDiffEntry {
    name: string;
    notes: number;
    data: {
        // Arrays of length 12 (Indices 0-11 correspond to OD 0-11)
        sr: number[];
        pp100: number[];
        pp95: number[];
        pp90: number[];
    };
}

export interface ODMapsetEntry {
    mapsetId: string;
    artist: string;
    title: string;
    difficulties: ODDiffEntry[];
}

// This type is just an array of mapsets in the JSON file
export type ODMapsDataset = ODMapsetEntry[];