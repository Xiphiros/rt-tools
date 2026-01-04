import { TimingPoint } from '../types';

/**
 * Finds the timing point active at a specific time.
 * Logic:
 * 1. If time is before the first TP, return the first TP (Backward Extrapolation).
 * 2. Otherwise, return the latest TP that is <= time.
 */
export const getActiveTimingPoint = (timeMs: number, timingPoints: TimingPoint[]): TimingPoint | null => {
    if (timingPoints.length === 0) return null;

    // Sort to be safe (though editor usually keeps them sorted)
    const sorted = [...timingPoints].sort((a, b) => a.time - b.time);

    // 1. Backward Extrapolation
    // If we are before the first point, the first point applies backwards to 0.
    if (timeMs < sorted[0].time) {
        return sorted[0];
    }

    // 2. Standard Search (Find latest point <= time)
    // Iterate backwards to find the first match
    for (let i = sorted.length - 1; i >= 0; i--) {
        if (timeMs >= sorted[i].time) {
            return sorted[i];
        }
    }

    return sorted[0];
};

/**
 * Calculates the exact timestamp of the nearest snapped beat.
 */
export const snapTime = (
    rawTime: number, 
    timingPoints: TimingPoint[], 
    snapDivisor: number
): number => {
    const tp = getActiveTimingPoint(rawTime, timingPoints);
    if (!tp) return rawTime;

    const msPerBeat = 60000 / tp.bpm;
    const snapInterval = msPerBeat / snapDivisor;

    // Calculate how many snaps have passed since the Timing Point's offset
    // This works for both positive (future) and negative (backward extrapolation) deltas
    const delta = rawTime - tp.time;
    const snaps = Math.round(delta / snapInterval);

    return tp.time + (snaps * snapInterval);
};

/**
 * Determines if a specific time is on a beat, measure, etc.
 * Useful for grid coloring.
 */
export const getBeatSignature = (time: number, timingPoints: TimingPoint[]): number => {
    const tp = getActiveTimingPoint(time, timingPoints);
    if (!tp) return 0;

    const msPerBeat = 60000 / tp.bpm;
    const epsilon = 1; // 1ms tolerance

    const delta = time - tp.time;
    const beats = delta / msPerBeat;
    
    // Check closest integer beat
    const roundBeat = Math.round(beats);
    
    if (Math.abs(beats - roundBeat) * msPerBeat < epsilon) {
        // It falls on a beat
        // Check if it's a downbeat (start of measure)
        // Assume 4/4 if meter is missing
        const meter = tp.meter || 4; 
        
        if (roundBeat % meter === 0) return 1; // Measure Start (Big White Line)
        if (Number.isInteger(roundBeat)) return 4; // Quarter Note (Red/Blue Line)
    }
    
    return 0; // Micro-snap
};