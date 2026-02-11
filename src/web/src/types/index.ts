/**
 * Shared Type Definitions
 * Terminology Update:
 * - Live: Original API values.
 * - Rework: New Star Ratings + Standard Formula.
 * - RS: Rhythm Scoring System.
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
    
    // Aggregates
    reworkTotalPP: number; // Weighted Rework
    totalRS: number;       // Weighted RS
    liveTotalPP: number;   // Raw API Total
    
    playCount: number;
    accuracy: number;
    
    plays: ReworkPlay[]; 
}