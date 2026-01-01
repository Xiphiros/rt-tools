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
    stars: number; // The calculated rework stars
    starsOfficial: number; // The current official stars
    stats: StrainResult['details'];
    link?: string | null;
}