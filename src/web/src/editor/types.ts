// Data structures representing the map being edited

export type NoteType = 'tap' | 'hold';

export interface EditorNote {
    id: string;         // Unique internal ID for the editor (UUID)
    time: number;       // ms
    column: number;     // 0-3 (typically) or mapped to keys
    key: string;        // Specific char (e.g. 'q', 'w')
    type: NoteType;
    duration?: number;  // ms (only for hold)
    selected?: boolean;
}

export interface EditorMapData {
    notes: EditorNote[];
    bpm: number;
    offset: number;
    // Metadata can be expanded here
}

export interface PlaybackState {
    isPlaying: boolean;
    currentTime: number; // ms
    playbackRate: number;
    duration: number;    // Total song length
}

export interface EditorSettings {
    snapDivisor: number; // 1 = 1/1, 2 = 1/2, 4 = 1/4
    playbackSpeed: number; // 1.0, 0.75, 0.5
    zoom: number;        // pixels per second
    metronome: boolean;
}

export interface HistoryState {
    past: EditorMapData[];
    present: EditorMapData;
    future: EditorMapData[];
}