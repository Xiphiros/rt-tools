/**
 * Shared Type Definitions
 * Terminology:
 * - Live: Original API values.
 * - Rework: New Star Ratings + Standard Formula.
 * - RS: Biometric Scoring System.
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
    
    stars: number; // New RR
    starsDT?: number;
    starsHT?: number;
    
    starsOfficial: number; // Live API SR
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
    
    // Aggregates - Must match component usage
    reworkTotalPP: number; 
    totalRS: number;       
    liveTotalPP: number;   
    
    playCount: number;
    accuracy: number;
    
    plays: ReworkPlay[]; 
}

// --- OD ANALYSIS DATASETS ---

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

export interface ODDiffEntry {
    name: string;
    notes: number;
    data: {
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

export type ODMapsDataset = ODMapsetEntry[];