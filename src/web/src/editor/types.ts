// Data structures representing the map being edited

export type NoteType = 'tap' | 'hold';
export type EditorTool = 'select' | 'pen' | 'eraser';

export interface HitsoundSettings {
    sampleSet: 'normal' | 'soft' | 'drum';
    volume: number; // 0-100
    additions: {
        whistle: boolean;
        finish: boolean;
        clap: boolean;
    };
}

export interface EditorNote {
    id: string;         
    time: number;       
    column: number;     
    key: string;        
    type: NoteType;
    duration?: number;  
    selected?: boolean;
    hitsound: HitsoundSettings;
}

export interface MapMetadata {
    title: string;
    artist: string;
    mapper: string;
    difficultyName: string;
    source: string;
    tags: string;
    backgroundFile: string;
    audioFile: string;
    previewTime: number;
}

export interface TimingPoint {
    id: string;
    time: number;
    bpm: number;
    meter: number; 
    kiai: boolean;
}

export interface EditorMapData {
    notes: EditorNote[];
    metadata: MapMetadata;
    timingPoints: TimingPoint[];
    bpm: number;
    offset: number;
}

export interface PlaybackState {
    isPlaying: boolean;
    currentTime: number; 
    playbackRate: number;
    duration: number;    
}

export interface EditorSettings {
    snapDivisor: number; 
    playbackSpeed: number;
    zoom: number;        
    metronome: boolean;
    snappingEnabled: boolean;
    showWaveform: boolean;
    
    // Volume Channels (0-100)
    masterVolume: number;
    musicVolume: number;
    hitsoundVolume: number;
    metronomeVolume: number;
}

export interface HistoryState {
    past: EditorMapData[];
    present: EditorMapData;
    future: EditorMapData[];
}

export interface ProjectSummary {
    id: string;
    title: string;
    artist: string;
    mapper: string;
    lastModified: number;
}