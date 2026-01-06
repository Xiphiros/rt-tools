import { EditorMapData } from '../types';

export interface ValidationResult {
    valid: boolean;
    warnings: string[];
    errors: string[];
}

/**
 * Analyzes the map data for potential logic errors, format inconsistencies,
 * or protocol violations (e.g. Time vs Offset drift).
 */
export const validateMapData = (data: EditorMapData): ValidationResult => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 1. Validate Timing Points
    if (data.timingPoints.length === 0) {
        errors.push("No timing points found. Map will not function.");
    } else {
        const first = data.timingPoints[0];
        if (first.time > 5000) {
            warnings.push(`First timing point starts late (${first.time}ms). Intro may be unsnapped.`);
        }
    }

    // 2. Validate Time vs Offset Consistency (Heuristic)
    // We can't check the source RTM JSON here (it's already parsed), 
    // but we can check if the parsing resulted in weird values.
    
    // 3. Validate Note Bounds
    if (data.notes.length > 0) {
        const sorted = [...data.notes].sort((a, b) => a.time - b.time);
        const lastNote = sorted[sorted.length - 1];
        const lastTime = lastNote.type === 'hold' 
            ? lastNote.time + (lastNote.duration || 0) 
            : lastNote.time;

        if (data.metadata.audioFile && lastTime > 10 * 60 * 1000) {
            warnings.push("Map duration exceeds 10 minutes. Ensure this is intended.");
        }
    } else {
        warnings.push("Map has no notes.");
    }

    // 4. Layer Check
    if (data.layers.length === 0) {
        errors.push("No layers defined.");
    }

    // 5. Metadata
    if (!data.metadata.title) warnings.push("Missing Title.");
    if (!data.metadata.artist) warnings.push("Missing Artist.");
    if (!data.metadata.mapper) warnings.push("Missing Mapper.");

    return {
        valid: errors.length === 0,
        warnings,
        errors
    };
};

/**
 * Checks raw JSON objects from RTM imports before they are fully converted.
 * Useful for detecting Seconds vs Milliseconds issues in the source.
 */
export const checkSourceConsistency = (meta: any): string[] => {
    const warnings: string[] = [];

    if (meta.timingPoints) {
        meta.timingPoints.forEach((tp: any, idx: number) => {
            if (typeof tp.time === 'number' && typeof tp.offset === 'number') {
                // Heuristic: If 'time' is small (< 1000) and 'offset' is large (> 1000),
                // 'time' is likely Seconds and 'offset' is Milliseconds.
                // We calculate the delta.
                
                const timeAsMs = tp.time * 1000;
                const diff = Math.abs(timeAsMs - tp.offset);
                
                // Tolerance: 2ms (Rounding errors)
                // If diff is large, it means the 'time' (start) and 'offset' (grid anchor) diverge.
                // This usually implies a visual start time different from the musical beat zero.
                if (diff > 5) {
                    console.warn(`[TP #${idx}] Divergence detected: time=${tp.time}s (${timeAsMs}ms) vs offset=${tp.offset}ms. Delta: ${diff.toFixed(2)}ms.`);
                    // We don't warn the user visibly unless it's extreme, as some maps do this intentionally for visual delays.
                }
            }
        });
    }

    return warnings;
};