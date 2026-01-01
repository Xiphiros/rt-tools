function normalizeNotes(rawNotes) {
    if (!rawNotes || rawNotes.length === 0) return []
    const standardNotes = rawNotes.map(n => {
        const start = n.time !== undefined ? n.time : n.startTime
        let duration = 0
        if (n.type === 'hold' && n.endTime) {
            duration = Math.max(0, n.endTime - start)
            if (duration < 40) duration = 0
        }
        return {
            time: start,
            duration: duration,
            key: String(n.key).toLowerCase(),
            type: duration > 0 ? 'hold' : 'tap'
        }
    }).sort((a, b) => a.time - b.time)

    const rows = []
    let currentRow = { time: standardNotes[0].time, notes: [standardNotes[0]] }
    const CHORD_TOLERANCE = 10
    for (let i = 1; i < standardNotes.length; i++) {
        const note = standardNotes[i]
        if (Math.abs(note.time - currentRow.time) < CHORD_TOLERANCE) {
            currentRow.notes.push(note)
        } else {
            rows.push(currentRow)
            currentRow = { time: note.time, notes: [note] }
        }
    }
    rows.push(currentRow)
    return rows
}

/**
 * TOP-HEAVY AGGREGATION:
 * Instead of summing everything with a steady decay, we treat the hardest peaks
 * as the "base" and apply a much more aggressive decay to the "rest".
 * This ensures a map's rating is defined by its hardest 15-20 seconds.
 */
function aggregatePeaks(peaks) {
    if (peaks.length === 0) return 0
    const sortedPeaks = [...peaks].sort((a, b) => b - a)
    
    let total = 0
    
    // Harder initial decay to separate Spikes from Plateaus
    // 1st peak = 100%, 2nd = 65%, 3rd = 42%, etc.
    let weight = 1.0
    const decay = 0.65 
    
    for (let i = 0; i < sortedPeaks.length; i++) {
        total += sortedPeaks[i] * weight
        
        // As the list goes on, reduce the weight even further
        weight *= decay
        if (weight < 0.001) break
    }
    
    return total
}

module.exports = { normalizeNotes, aggregatePeaks }