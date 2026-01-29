// Shared Types for the Frontend

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
    stars: number;
    starsOfficial: number;
    stats: StrainResult['details'];
    link?: string | null;
}

export interface ReworkPlay {
    songName: string;
    diffName: string;
    mapper: string;
    
    // Official Stats
    oldPP: number;
    
    // Rework Stats
    rr: number;      // Rhythm Rating (Map Difficulty)
    rs: number;      // Rhythm Score (Performance Value)
    
    acc: number;
    speed: number;   // Playback rate (e.g. 1.0, 1.5)
    mods: string[];
    score: number;
}

export interface PlayerProfile {
    rank: number;
    userId: string;
    username: string;
    country: string;
    avatar: string | null;
    
    // Official System
    officialPP: number;
    
    // Rework System
    reworkRating: number; // Effective Level (Weighted Avg)
    
    playCount: number;
    accuracy: number;
    
    // Detailed Plays (Sorted by Rework Rating by default)
    plays: ReworkPlay[]; 
}