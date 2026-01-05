// --- CONFIGURATION ---
// Physical Rows
const ROWS = {
    TOP: 0,
    HOME: 1,
    BOTTOM: 2
};

// Hand Definition (0 = Left, 1 = Right)
const HANDS = {
    LEFT: 0,
    RIGHT: 1
};

// Key Definitions (Rows x Hands)
// We assign keys to specific "slots" to manage finger usage.
// Row 0: Q W E R T | Y U I O P
// Row 1: A S D F G | H J K L ;
// Row 2: Z X C V B | N M , . /

const KEY_MAP = {
    [ROWS.TOP]:    ['q', 'w', 'e', 'r', 't',   'y', 'u', 'i', 'o', 'p'],
    [ROWS.HOME]:   ['a', 's', 'd', 'f', 'g',   'h', 'j', 'k', 'l', ';'],
    [ROWS.BOTTOM]: ['z', 'x', 'c', 'v', 'b',   'n', 'm', ',', '.', '/']
};

// --- STATE TRACKING ---
class MapperState {
    constructor() {
        this.lastHand = HANDS.LEFT;
        this.lastRow = ROWS.HOME;
        
        // Track usage of specific keys to avoid overlaps
        // Map<KeyChar, ReleaseTime>
        this.keyOccupancy = new Map();
        
        // Track column history for patterns
        // Map<OsuColumn, RtmKey>
        this.columnMapping = new Map();
    }

    isKeyFree(key, time) {
        if (!this.keyOccupancy.has(key)) return true;
        return this.keyOccupancy.get(key) <= time;
    }

    occupyKey(key, endTime) {
        this.keyOccupancy.set(key, endTime + 50); // Buffer
    }
}

/**
 * Heuristic 1: Stream Flow
 * If single notes are coming fast, alternate hands on Home Row.
 */
function mapStream(note, state) {
    const hand = state.lastHand === HANDS.LEFT ? HANDS.RIGHT : HANDS.LEFT;
    state.lastHand = hand;

    // Prefer Home Row for streams
    const row = ROWS.HOME;
    
    // Pick a finger based on hand
    // Left: 0-4, Right: 5-9
    const indexBase = hand === HANDS.LEFT ? 2 : 7; // Middle fingers preference
    const key = KEY_MAP[row][indexBase];

    // Simple conflict check
    if (state.isKeyFree(key, note.time)) {
        return { key, row, hand };
    }
    
    // Fallback neighbors
    return findFreeKey(row, hand, note.time, state);
}

/**
 * Heuristic 2: Chord Distribution
 * Distribute chord notes across rows/hands to maximize impact.
 */
function mapChord(notes, state) {
    const result = [];
    const count = notes.length;
    
    // Pattern: Split hands
    // 2 notes: 1 Left, 1 Right
    // 3 notes: 2 Left, 1 Right (alternate)
    
    let currentHand = state.lastHand === HANDS.LEFT ? HANDS.RIGHT : HANDS.LEFT;
    
    // Distribute rows: 
    // Kick -> Bot
    // Snare -> Top
    // Melody -> Home
    // Since we don't have audio analysis, we use osu! columns as proxy.
    // Outer columns (0, 6) -> Bottom (Pinkies/Bass)
    // Inner columns (3) -> Top (Thumb/Space/Center)
    
    for (const note of notes) {
        let row = ROWS.HOME;
        if (note.column === 0 || note.column === 6) row = ROWS.BOTTOM;
        else if (note.column === 3) row = ROWS.TOP;
        
        const mapped = findFreeKey(row, currentHand, note.time, state);
        if (mapped) {
            result.push({ ...note, key: mapped.key });
            state.occupyKey(mapped.key, note.endTime || note.time);
        }
        
        currentHand = currentHand === HANDS.LEFT ? HANDS.RIGHT : HANDS.LEFT;
    }
    
    state.lastHand = currentHand;
    return result;
}

function findFreeKey(row, hand, time, state) {
    const startIdx = hand === HANDS.LEFT ? 0 : 5;
    const endIdx = hand === HANDS.LEFT ? 4 : 9;
    
    // Try preferred fingers first (Index/Middle)
    const preferences = hand === HANDS.LEFT ? [3, 2, 1, 0, 4] : [6, 7, 8, 9, 5];
    
    for (const offset of preferences) {
        const key = KEY_MAP[row][offset]; // Direct index from preferences? No, offset is absolute index 0-9
        if (!key) continue;
        
        // Wait, KEY_MAP[row] is array of 10. preferences are indices.
        const char = KEY_MAP[row][offset];
        if (state.isKeyFree(char, time)) {
            return { key: char, row, hand };
        }
    }
    
    // Try other rows if this one is full
    for (const otherRow of [ROWS.HOME, ROWS.TOP, ROWS.BOTTOM]) {
        if (otherRow === row) continue;
         for (const offset of preferences) {
            const char = KEY_MAP[otherRow][offset];
            if (state.isKeyFree(char, time)) {
                return { key: char, row: otherRow, hand };
            }
        }
    }
    
    return null; // Failed to find key (rare)
}

export function convertToRtm(osuData) {
    const state = new MapperState();
    const rtmNotes = [];

    // Group by time to detect chords
    const groups = new Map();
    osuData.HitObjects.forEach(obj => {
        if (!groups.has(obj.time)) groups.set(obj.time, []);
        groups.get(obj.time).push(obj);
    });

    const sortedTimes = Array.from(groups.keys()).sort((a, b) => a - b);

    for (const time of sortedTimes) {
        const notes = groups.get(time);
        
        if (notes.length === 1) {
            // Single Note -> Stream Logic
            const note = notes[0];
            const mapped = mapStream(note, state);
            if (mapped) {
                rtmNotes.push({
                    key: mapped.key,
                    time: note.time,
                    type: note.type,
                    startTime: note.type === 'hold' ? note.time : undefined,
                    endTime: note.type === 'hold' ? note.endTime : undefined
                });
                state.occupyKey(mapped.key, note.endTime || note.time);
            }
        } else {
            // Chord Logic
            const mappedNotes = mapChord(notes, state);
            mappedNotes.forEach(n => {
                rtmNotes.push({
                    key: n.key,
                    time: n.time,
                    type: n.type,
                    startTime: n.type === 'hold' ? n.time : undefined,
                    endTime: n.type === 'hold' ? n.endTime : undefined
                });
            });
        }
    }

    return {
        mapsetId: `converted-${osuData.Metadata.BeatmapSetID}`,
        diffId: `diff-${osuData.Metadata.BeatmapID}`,
        name: osuData.Metadata.Version,
        overallDifficulty: parseFloat(osuData.Difficulty.OverallDifficulty),
        notes: rtmNotes
    };
}