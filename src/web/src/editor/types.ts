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

export interface LoopSettings {
    sampleSet: 'normal' | 'soft' | 'drum';
    volume: number;
}

export interface EditorLayer {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    color: string;
}

export interface EditorNote {
    id: string;          
    time: number;        
    column: number;      
    key: string;        
    type: NoteType;
    duration?: number;   
    selected?: boolean;
    layerId: string;
    
    // Primary Hitsound (Tap, or Head of Hold)
    hitsound: HitsoundSettings;
    
    // Hold Specific Hitsounds
    holdTailHitsound?: HitsoundSettings;
    holdLoopHitsound?: LoopSettings; 
}

export interface MapMetadata {
    title: string;
    artist: string;
    mapper: string;
    difficultyName: string;
    overallDifficulty: number;
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
    diffId: string;
    notes: EditorNote[];
    layers: EditorLayer[];
    
    // Staging area for notes imported from references
    draftNotes: EditorNote[]; 

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
    
    // View Options
    dimInactiveLayers: boolean;
    
    // Visual Settings
    rowOffsets: [number, number, number];   // Y-Axis [Top, Home, Bot]
    rowXOffsets: [number, number, number];  // X-Axis [Top, Home, Bot] (New)
    noteShape: 'circle' | 'diamond' | 'square';
    approachStyle: 'standard' | 'inverted'; 
    approachRate: number; 

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

export interface DifficultySummary {
    id: string;
    name: string;
    lastModified: number;
}