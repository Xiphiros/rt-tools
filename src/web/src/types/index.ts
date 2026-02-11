/**
 * Shared Type Definitions for RhythmTyper Community Tools
 * Supports 3-way metric comparison: Import (API), Official (Hybrid), Rework (RS).
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
    
    // 1. Proposed Official Metrics (New SR + Old Formula)
    officialPP: number; 
    
    // 2. Rhythm Score Metrics (New SR + New Formula)
    rs: number;         
    rr: number;         // Rhythm Rating (New Difficulty)
    
    // 3. Original API Metrics (Old SR + Old Formula)
    importPP: number;   // Raw value from game
    importSR: number;   // Original Star Rating
    
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
    
    // Aggregate Metrics
    officialPP: number;    // Weighted Hybrid Total
    reworkRating: number;  // Weighted RS Total
    importTotalPP: number; // Raw API Total
    
    playCount: number;
    accuracy: number;
    
    // Deep History
    plays: ReworkPlay[]; 
}