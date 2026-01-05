import { EditorMapData, EditorNote, HistoryState, MapMetadata, TimingPoint, EditorLayer } from '../types';

// --- ACTIONS ---
export type EditorAction =
    | { type: 'LOAD_MAP'; payload: EditorMapData }
    | { type: 'ADD_NOTE'; payload: EditorNote }
    | { type: 'REMOVE_NOTES'; payload: string[] }
    | { type: 'UPDATE_NOTE'; payload: { id: string; changes: Partial<EditorNote> } }
    | { type: 'SELECT_NOTES'; payload: { ids: string[]; append: boolean } }
    | { type: 'DESELECT_ALL' }
    | { type: 'UPDATE_METADATA'; payload: Partial<MapMetadata> }
    | { type: 'ADD_TIMING_POINT'; payload: TimingPoint }
    | { type: 'UPDATE_TIMING_POINT'; payload: { id: string; changes: Partial<TimingPoint> } }
    | { type: 'REMOVE_TIMING_POINT'; payload: string }
    
    // Layer Actions
    | { type: 'ADD_LAYER'; payload: EditorLayer }
    | { type: 'REMOVE_LAYER'; payload: string }
    | { type: 'UPDATE_LAYER'; payload: { id: string; changes: Partial<EditorLayer> } }
    | { type: 'REORDER_LAYERS'; payload: EditorLayer[] }
    | { type: 'MERGE_LAYER_DOWN'; payload: string }

    | { type: 'UNDO' }
    | { type: 'REDO' };

const pushHistory = (state: HistoryState): HistoryState => {
    const newPast = [...state.past, state.present].slice(-50);
    return {
        past: newPast,
        present: { ...state.present }, // Shallow copy
        future: []
    };
};

// Default Layer ID
export const DEFAULT_LAYER_ID = 'default-layer';

export const initialMapData: EditorMapData = {
    notes: [],
    // Initialize with a default layer
    layers: [
        { id: DEFAULT_LAYER_ID, name: 'Pattern 1', visible: true, locked: false, color: '#38bdf8' }
    ],
    metadata: {
        title: '', artist: '', mapper: '', difficultyName: '', source: '', tags: '',
        backgroundFile: '', audioFile: '', previewTime: 0
    },
    timingPoints: [{ id: 'initial-timing', time: 0, bpm: 120, meter: 4, kiai: false }],
    bpm: 120, offset: 0
};

export const initialHistory: HistoryState = {
    past: [],
    present: initialMapData,
    future: []
};

// Helper to ensure data validity
const validateMapData = (data: EditorMapData): EditorMapData => {
    // 1. Ensure at least one layer exists
    if (!data.layers || data.layers.length === 0) {
        data.layers = [
            { id: DEFAULT_LAYER_ID, name: 'Default', visible: true, locked: false, color: '#38bdf8' }
        ];
    }
    
    // 2. Ensure all notes have a valid layerId
    // If missing, assign to the first layer
    const firstLayerId = data.layers[0].id;
    data.notes = data.notes.map(n => ({
        ...n,
        layerId: n.layerId || firstLayerId
    }));

    return data;
};

export const editorReducer = (state: HistoryState, action: EditorAction): HistoryState => {
    switch (action.type) {
        case 'LOAD_MAP': {
            const validated = validateMapData(action.payload);
            return { past: [], present: validated, future: [] };
        }

        case 'ADD_NOTE': {
            const next = pushHistory(state);
            next.present.notes = [...next.present.notes, action.payload].sort((a, b) => a.time - b.time);
            return next;
        }

        case 'REMOVE_NOTES': {
            const next = pushHistory(state);
            const ids = new Set(action.payload);
            next.present.notes = next.present.notes.filter(n => !ids.has(n.id));
            return next;
        }

        case 'UPDATE_NOTE': {
            const next = { ...state, present: { ...state.present } };
            const nextNotes = next.present.notes.map(n => 
                n.id === action.payload.id ? { ...n, ...action.payload.changes } : n
            ).sort((a, b) => a.time - b.time);
            next.present.notes = nextNotes;
            return next; 
        }

        case 'SELECT_NOTES': {
            const next = { ...state, present: { ...state.present } };
            const ids = new Set(action.payload.ids);
            next.present.notes = next.present.notes.map(n => {
                if (action.payload.append) {
                    if (ids.has(n.id)) return { ...n, selected: true };
                    return n;
                }
                return { ...n, selected: ids.has(n.id) };
            });
            return next;
        }

        case 'DESELECT_ALL': {
            const next = { ...state, present: { ...state.present } };
            next.present.notes = next.present.notes.map(n => ({ ...n, selected: false }));
            return next;
        }

        case 'UPDATE_METADATA': {
            const next = pushHistory(state);
            next.present.metadata = { ...next.present.metadata, ...action.payload };
            return next;
        }

        case 'ADD_TIMING_POINT': {
            const next = pushHistory(state);
            next.present.timingPoints = [...next.present.timingPoints, action.payload].sort((a, b) => a.time - b.time);
            return next;
        }

        case 'UPDATE_TIMING_POINT': {
            const next = pushHistory(state);
            next.present.timingPoints = next.present.timingPoints.map(tp => 
                tp.id === action.payload.id ? { ...tp, ...action.payload.changes } : tp
            ).sort((a, b) => a.time - b.time);
            return next;
        }

        case 'REMOVE_TIMING_POINT': {
            const next = pushHistory(state);
            next.present.timingPoints = next.present.timingPoints.filter(tp => tp.id !== action.payload);
            return next;
        }

        // --- LAYER ACTIONS ---

        case 'ADD_LAYER': {
            const next = pushHistory(state);
            next.present.layers = [...next.present.layers, action.payload];
            return next;
        }

        case 'REMOVE_LAYER': {
            const layerId = action.payload;
            // Prevent deleting the last layer
            if (state.present.layers.length <= 1) return state;

            const next = pushHistory(state);
            
            // Delete the layer
            next.present.layers = next.present.layers.filter(l => l.id !== layerId);
            
            // Delete all notes in that layer
            // (Alternative design: Move notes to Default layer? For now, delete like Photoshop)
            next.present.notes = next.present.notes.filter(n => n.layerId !== layerId);
            
            return next;
        }

        case 'UPDATE_LAYER': {
            // Updating visibility/lock doesn't strictly need history if we want instant feedback,
            // but for "Rename" or "Color Change", undo is nice.
            // Let's push history for safety.
            const next = pushHistory(state);
            next.present.layers = next.present.layers.map(l => 
                l.id === action.payload.id ? { ...l, ...action.payload.changes } : l
            );
            return next;
        }

        case 'REORDER_LAYERS': {
            const next = pushHistory(state);
            next.present.layers = action.payload;
            return next;
        }

        case 'UNDO': {
            if (state.past.length === 0) return state;
            const previous = state.past[state.past.length - 1];
            const newPast = state.past.slice(0, state.past.length - 1);
            return {
                past: newPast,
                present: previous,
                future: [state.present, ...state.future]
            };
        }

        case 'REDO': {
            if (state.future.length === 0) return state;
            const next = state.future[0];
            const newFuture = state.future.slice(1);
            return {
                past: [...state.past, state.present],
                present: next,
                future: newFuture
            };
        }

        default:
            return state;
    }
};