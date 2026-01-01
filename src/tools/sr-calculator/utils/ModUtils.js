/**
 * Utility functions for handling playback rate modifications (DT/HT/Custom Rates).
 * Applies mathematical transformations to timestamps and Overall Difficulty (OD).
 */

const MIN_RATE = 0.1;
const MAX_RATE = 2.0;
const SNAP_THRESHOLD_MS = 20; // Notes closer than this are treated as a chord

/**
 * Scales note timestamps based on playback rate.
 * @param {Array} notes - Array of note objects.
 * @param {Number} rate - Playback speed multiplier (e.g., 1.5 for DT).
 * @returns {Array} New array of notes with scaled timestamps.
 */
function scaleNotes(notes, rate) {
    if (!notes || notes.length === 0) return [];
    
    // Clamp rate to safe bounds
    const safeRate = Math.max(MIN_RATE, Math.min(MAX_RATE, rate));
    
    // If rate is 1, return a shallow copy to prevent mutation issues downstream
    if (Math.abs(safeRate - 1.0) < 0.001) {
        return notes.map(n => ({ ...n }));
    }

    return notes.map(note => {
        // Deep copy note to avoid mutating original data
        const newNote = { ...note };

        // Scale timing fields
        // Higher rate = Faster song = Smaller timestamps
        if (newNote.startTime !== undefined) newNote.startTime /= safeRate;
        if (newNote.endTime !== undefined) newNote.endTime /= safeRate;
        if (newNote.time !== undefined) newNote.time /= safeRate;
        
        // Duration automatically scales if start/end scale, but if stored separately:
        if (newNote.duration !== undefined) newNote.duration /= safeRate;

        return newNote;
    });
}

/**
 * Recalculates Overall Difficulty (OD) to match the new window size in wall-clock time.
 * @param {Number} originalOD 
 * @param {Number} rate 
 * @returns {Number} New OD value
 */
function scaleOD(originalOD, rate) {
    const safeRate = Math.max(MIN_RATE, Math.min(MAX_RATE, rate));
    
    if (Math.abs(safeRate - 1.0) < 0.001) return originalOD;

    // 1. Calculate original window size in ms
    const originalWindow = 80 - (6 * originalOD);

    // 2. Scale window (Faster rate = Smaller window = Harder)
    const newWindow = originalWindow / safeRate;

    // 3. Convert back to OD
    let newOD = (80 - newWindow) / 6;

    return Math.max(0, Math.min(11, newOD));
}

/**
 * Snaps notes that are extremely close together to the same timestamp.
 * This effectively converts "flams" or "rolls" (e.g., <20ms gap) into chords,
 * preventing the strain calculator from treating them as impossible speed streams.
 * 
 * @param {Array} notes 
 * @returns {Array} New array of notes with snapped timestamps.
 */
function snapNotes(notes) {
    if (!notes || notes.length === 0) return [];

    // 1. Sort notes by time to ensure sequential processing
    // Normalize time access using a quick helper
    const getTime = (n) => (n.startTime !== undefined ? n.startTime : n.time) || 0;
    
    const sortedNotes = notes.map(n => ({...n})).sort((a, b) => getTime(a) - getTime(b));
    
    if (sortedNotes.length === 0) return [];

    // 2. Iterate and snap
    let currentClusterTime = getTime(sortedNotes[0]);
    
    for (let i = 0; i < sortedNotes.length; i++) {
        const t = getTime(sortedNotes[i]);

        // If this note is within threshold of the current cluster start, snap it back
        if (t - currentClusterTime < SNAP_THRESHOLD_MS) {
            if (sortedNotes[i].startTime !== undefined) sortedNotes[i].startTime = currentClusterTime;
            if (sortedNotes[i].time !== undefined) sortedNotes[i].time = currentClusterTime;
        } else {
            // Otherwise, start a new cluster
            currentClusterTime = t;
        }
    }

    return sortedNotes;
}

module.exports = {
    scaleNotes,
    scaleOD,
    snapNotes
};