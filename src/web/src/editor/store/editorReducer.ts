import { EditorMapData, EditorNote, HistoryState, MapMetadata, TimingPoint } from '../types';

// --- ACTIONS ---
export type EditorAction =
    | { type: 'LOAD_MAP'; payload: EditorMapData }
    // Note Actions
    | { type: 'ADD_NOTE'; payload: EditorNote }
    | { type: 'REMOVE_NOTES'; payload: string[] }
    | { type: 'UPDATE_NOTE'; payload: { id: string; changes: Partial<EditorNote> } }
    | { type: 'SELECT_NOTES'; payload: { ids: string[]; append: boolean } }
    | { type: 'DESELECT_ALL' }
    // Metadata & Timing
    | { type: 'UPDATE_METADATA'; payload: Partial<MapMetadata> }
    | { type: 'ADD_TIMING_POINT'; payload: TimingPoint }
    | { type: 'UPDATE_TIMING_POINT'; payload: { id: string; changes: Partial<TimingPoint> } }
    | { type: 'REMOVE_TIMING_POINT'; payload: string }
    // Global
    | { type: 'SET_SNAP'; payload: number }
    | { type: 'SET_ZOOM'; payload: number }
    | { type: 'UNDO' }
    | { type: 'REDO' };

// --- HELPERS ---
const pushHistory = (state: HistoryState): HistoryState => {
    const newPast = [...state.past, state.present].slice(-50);
    return {
        past: newPast,
        present: { ...state.present },
        future: []
    };
};

// --- INITIAL STATE ---
export const initialMapData: EditorMapData = {
    notes: [],
    metadata: {
        title: '',
        artist: '',
        mapper: '',
        difficultyName: '',
        source: '',
        tags: '',
        backgroundFile: '',
        audioFile: '',
        previewTime: 0
    },
    timingPoints: [{
        id: 'initial-timing',
        time: 0,
        bpm: 120,
        meter: 4,
        kiai: false
    }],
    bpm: 120,
    offset: 0
};

export const initialHistory: HistoryState = {
    past: [],
    present: initialMapData,
    future: []
};

// --- REDUCER ---
export const editorReducer = (state: HistoryState, action: EditorAction): HistoryState => {
    switch (action.type) {
        case 'LOAD_MAP':
            return {
                past: [],
                present: action.payload,
                future: []
            };

        // --- NOTE OPERATIONS ---
        case 'ADD_NOTE': {
            const next = pushHistory(state);
            next.present.notes = [...next.present.notes, action.payload];
            next.present.notes.sort((a, b) => a.time - b.time);
            return next;
        }

        case 'REMOVE_NOTES': {
            const next = pushHistory(state);
            const idsToRemove = new Set(action.payload);
            next.present.notes = next.present.notes.filter(n => !idsToRemove.has(n.id));
            return next;
        }

        case 'UPDATE_NOTE': {
            const next = pushHistory(state);
            next.present.notes = next.present.notes.map(n => 
                n.id === action.payload.id ? { ...n, ...action.payload.changes } : n
            );
            next.present.notes.sort((a, b) => a.time - b.time);
            return next;
        }

        case 'SELECT_NOTES': {
            const next = { ...state, present: { ...state.present } };
            const idsToSelect = new Set(action.payload.ids);
            next.present.notes = next.present.notes.map(n => {
                if (action.payload.append) {
                    if (idsToSelect.has(n.id)) return { ...n, selected: true };
                    return n;
                } else {
                    return { ...n, selected: idsToSelect.has(n.id) };
                }
            });
            return next;
        }

        case 'DESELECT_ALL': {
            const next = { ...state, present: { ...state.present } };
            next.present.notes = next.present.notes.map(n => ({ ...n, selected: false }));
            return next;
        }

        // --- METADATA & TIMING ---
        case 'UPDATE_METADATA': {
            const next = pushHistory(state);
            next.present.metadata = { ...next.present.metadata, ...action.payload };
            return next;
        }

        case 'ADD_TIMING_POINT': {
            const next = pushHistory(state);
            next.present.timingPoints = [...next.present.timingPoints, action.payload]
                .sort((a, b) => a.time - b.time);
            
            // Sync legacy fields if it's the first point
            if (next.present.timingPoints[0]) {
                next.present.bpm = next.present.timingPoints[0].bpm;
                next.present.offset = next.present.timingPoints[0].time;
            }
            return next;
        }

        case 'UPDATE_TIMING_POINT': {
            const next = pushHistory(state);
            next.present.timingPoints = next.present.timingPoints.map(tp => 
                tp.id === action.payload.id ? { ...tp, ...action.payload.changes } : tp
            ).sort((a, b) => a.time - b.time);

            if (next.present.timingPoints[0]) {
                next.present.bpm = next.present.timingPoints[0].bpm;
                next.present.offset = next.present.timingPoints[0].time;
            }
            return next;
        }

        case 'REMOVE_TIMING_POINT': {
            const next = pushHistory(state);
            next.present.timingPoints = next.present.timingPoints.filter(tp => tp.id !== action.payload);
            
            if (next.present.timingPoints[0]) {
                next.present.bpm = next.present.timingPoints[0].bpm;
                next.present.offset = next.present.timingPoints[0].time;
            }
            return next;
        }

        // --- HISTORY ---
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