// --- CONSTANTS ---

const ROWS = {
    TOP: 0,
    HOME: 1,
    BOTTOM: 2
};

// Standard Typing Position Mapping (7K optimized)
// Maps osu! columns (0-6) to vertical Key Clusters.
// We use a standard "home row" placement for 7K:
// Left: Pinky, Ring, Middle
// Center: Index (Left/Right alternating)
// Right: Middle, Ring, Pinky
// Note: We skip index fingers for the outer columns to reserve them for the heavy center lane.

const COLUMN_MAPPING = {
    // Col 0 -> Left Pinky (Q, A, Z)
    0: ['q', 'a', 'z'],
    // Col 1 -> Left Ring (W, S, X)
    1: ['w', 's', 'x'],
    // Col 2 -> Left Middle (E, D, C)
    2: ['e', 'd', 'c'],
    
    // Col 3 -> CENTER (Special handling, alternates between Left Index Inner and Right Index Inner)
    // Left Index Inner: R, F, V
    // Right Index Inner: Y, H, N (or U, J, M depending on spacing)
    // We'll define two clusters for Col 3 and alternate.
    3: {
        left: ['r', 'f', 'v'],
        right: ['y', 'h', 'n'] // Using YHN keeps hands closer, UJM is wider. YHN is safer for "Center" reach.
    },

    // Col 4 -> Right Middle (U, J, M) - Shifted to Index/Middle zone for better ergonomics
    4: ['u', 'j', 'm'],
    // Col 5 -> Right Ring (I, K, ,)
    5: ['i', 'k', ','],
    // Col 6 -> Right Pinky (O, L, .)
    6: ['o', 'l', '.']
};

const ROW_PREFERENCE = [ROWS.HOME, ROWS.TOP, ROWS.BOTTOM];

// --- STATE MANAGEMENT ---

class LayoutSolver {
    constructor() {
        // Track the release time of every key on the keyboard
        // Map<KeyChar, ReleaseTimeMs>
        this.keyState = new Map();

        // Track the last used row for each osu! column to encourage flow
        // Map<ColIndex, RowIndex>
        this.lastRowForCol = new Map();

        // Track last usage time of a column to detect jacks
        this.lastTimeForCol = new Map();

        // Center column alternation state (0 = Left, 1 = Right)
        this.centerHand = 0;
    }

    /**
     * Checks if a specific key is free at the given time.
     */
    isKeyFree(key, time) {
        if (!this.keyState.has(key)) return true;
        // Buffer: 10ms to prevent instant overlap glitches
        return this.keyState.get(key) <= time + 5; 
    }

    occupyKey(key, endTime) {
        this.keyState.set(key, endTime);
    }

    /**
     * Selects the best key for a given column and time.
     */
    solveNote(col, time, duration = 0) {
        let candidates = [];
        let isCenter = false;

        // 1. Determine Candidate Keys
        if (col === 3) {
            isCenter = true;
            // For center column, pick the hand that wasn't used last time (simple alternation)
            // Or strictly alternate?
            // Let's look at the "Cluster" concept.
            // If the map is fast, strict alternation on Col 3 is essential.
            const side = this.centerHand === 0 ? 'left' : 'right';
            candidates = COLUMN_MAPPING[3][side];
        } else {
            // Standard columns
            candidates = COLUMN_MAPPING[col] || COLUMN_MAPPING[0]; // Fallback safety
        }

        // 2. Find Best Row
        // Strategy: Try Home -> Top -> Bottom.
        // Penalty: If key is occupied, skip.
        // Penalty: If key was used VERY recently (fast jack), skip to next row (create vertical stream).
        
        const lastRow = this.lastRowForCol.get(col) ?? ROWS.HOME;
        const lastTime = this.lastTimeForCol.get(col) ?? -1000;
        const dt = time - lastTime;

        // JACK SPEED THRESHOLD
        // If notes are closer than 150ms (approx > 6.6 NPS), force row change to avoid single-finger physical jacks.
        const isFastJack = dt < 150; 

        // Start search from preference order, but maybe bias away from `lastRow` if fast jack
        let bestKey = null;
        let selectedRow = -1;

        // Sequence of rows to try. 
        // If FastJack, rotate: Home -> Top -> Bottom -> Home
        const searchOrder = isFastJack 
            ? [ROWS.TOP, ROWS.BOTTOM, ROWS.HOME] // Prioritize moving away from home if jacking
            : [ROWS.HOME, ROWS.TOP, ROWS.BOTTOM];

        for (const rowIdx of searchOrder) {
            const char = candidates[rowIdx];
            
            if (this.isKeyFree(char, time)) {
                bestKey = char;
                selectedRow = rowIdx;
                break;
            }
        }

        // Emergency Fallback: If all rows are busy (holding long notes?), force the least overlapping one?
        // Or just pick Home and accept overlap (better than crash).
        if (!bestKey) {
            bestKey = candidates[ROWS.HOME];
            selectedRow = ROWS.HOME;
        }

        // 3. Update State
        const endTime = time + (duration || 0);
        this.occupyKey(bestKey, endTime);
        
        this.lastRowForCol.set(col, selectedRow);
        this.lastTimeForCol.set(col, time);

        if (isCenter) {
            // Flip hand for next center note
            this.centerHand = 1 - this.centerHand;
        }

        return bestKey;
    }
}

export function convertToRtm(osuData) {
    const solver = new LayoutSolver();
    const rtmNotes = [];

    // osu! data is usually sorted, but ensure it
    const sortedObjects = osuData.HitObjects.sort((a, b) => a.time - b.time);

    // Filter out objects that don't map to 7K well if the source wasn't 7K
    // But typically the parser handles the column math.
    // Standard osu!mania column calculation: 
    // column = floor(x * columnCount / 512)
    // We assume the parser passed in `column` (0-6).

    for (const obj of sortedObjects) {
        // Clamp column just in case
        const col = Math.max(0, Math.min(6, obj.column));
        
        const duration = obj.type === 'hold' ? (obj.endTime - obj.time) : 0;
        
        const key = solver.solveNote(col, obj.time, duration);

        rtmNotes.push({
            key: key,
            time: obj.time,
            type: obj.type,
            startTime: obj.type === 'hold' ? obj.time : undefined,
            endTime: obj.type === 'hold' ? obj.endTime : undefined,
            hitsound: mapHitsounds(obj.hitSound) // Helper to map basic hitsounds
        });
    }

    return {
        mapsetId: `converted-${osuData.Metadata.BeatmapSetID || Date.now()}`,
        diffId: `diff-${osuData.Metadata.BeatmapID || Date.now()}`,
        name: osuData.Metadata.Version || 'Converted',
        overallDifficulty: parseFloat(osuData.Difficulty.OverallDifficulty || 5),
        notes: rtmNotes
    };
}

// Basic Hitsound Mapping
function mapHitsounds(val) {
    // osu! HitSound bits: 1=Normal, 2=Whistle, 4=Finish, 8=Clap
    return {
        sampleSet: 'normal',
        volume: 70,
        additions: {
            whistle: (val & 2) > 0,
            finish: (val & 4) > 0,
            clap: (val & 8) > 0
        }
    };
}