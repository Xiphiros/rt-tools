import { EditorMapData, EditorNote, EditorSettings, HistoryState } from '../types';

// --- ACTIONS ---
export type EditorAction =
    | { type: 'LOAD_MAP'; payload: EditorMapData }
    | { type: 'ADD_NOTE'; payload: EditorNote }
    | { type: 'REMOVE_NOTES'; payload: string[] } // IDs
    | { type: 'UPDATE_NOTE'; payload: { id: string; changes: Partial<EditorNote> } }
    | { type: 'SELECT_NOTES'; payload: { ids: string[]; append: boolean } }
    | { type: 'DESELECT_ALL' }
    | { type: 'SET_SNAP'; payload: number }
    | { type: 'SET_ZOOM'; payload: number }
    | { type: 'UNDO' }
    | { type: 'REDO' };

// --- HELPERS ---
const pushHistory = (state: HistoryState): HistoryState => {
    // Limit history size to 50 steps
    const newPast = [...state.past, state.present].slice(-50);
    return {
        past: newPast,
        present: { ...state.present }, // Shallow copy for immutability check
        future: []
    };
};

// --- REDUCER ---
export const initialMapData: EditorMapData = {
    notes: [],
    bpm: 120,
    offset: 0
};

export const initialHistory: HistoryState = {
    past: [],
    present: initialMapData,
    future: []
};

export const editorReducer = (state: HistoryState, action: EditorAction): HistoryState => {
    switch (action.type) {
        case 'LOAD_MAP':
            return {
                past: [],
                present: action.payload,
                future: []
            };

        case 'ADD_NOTE': {
            const next = pushHistory(state);
            next.present.notes = [...next.present.notes, action.payload];
            // Keep sorted by time
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
            // Selection is transient state, usually NOT strictly part of Undo/Redo history 
            // regarding "Data Integrity", but we handle it in 'present' for simplicity here.
            // We do NOT call pushHistory because selecting isn't a "destructive" edit.
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