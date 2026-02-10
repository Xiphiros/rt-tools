/**
 * Shared Type Definitions for RhythmTyper Community Tools
 * Aligned with RR (Rhythm Rating) and RS (Rhythm Score) terminology.
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
    
    // Performance Metrics
    officialPP: number; // Renamed from oldPP
    rs: number;         // Rhythm Score (Reworked Performance Value)
    
    // Difficulty Metrics
    rr: number;         // Rhythm Rating (Calculated Map Difficulty)
    
    acc: number;        // Percentage (0-100)
    speed: number;      // Rate multiplier (1.0, 1.5, etc)
    mods: string[];
    score: number;      // Raw in-game score
}

export interface PlayerProfile {
    rank: number;
    userId: string;
    username: string;
    country: string;
    avatar: string | null;
    
    // Aggregate Metrics
    officialPP: number;    // Official Total PP
    reworkRating: number;  // Reworked Aggregate Rating (Weighted RS)
    
    playCount: number;
    accuracy: number;
    
    // Deep History
    plays: ReworkPlay[]; // Contains top plays (typically up to 100)
}