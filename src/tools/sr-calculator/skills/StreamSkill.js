const Skill = require('./Skill')
const PatternAnalyzer = require('../utils/PatternAnalyzer')
const { calculateVariance } = require('../utils/math')
const { KEY_MAP } = require('../constants')

class StreamSkill extends Skill {
    constructor() {
        super(0.15) // Fast decay for burst speed detection
        this.patternAnalyzer = new PatternAnalyzer()
        this.deltaHistory = []
        this.MAX_HISTORY = 12 // Window size for NPS averaging
    }

    calculateNoteStrain(row, prevRow, context) {
        if (!prevRow) return 0

        const dt = Math.max((row.time - prevRow.time) / 1000, 0.001)
        
        // 1. Update Timing Window
        // Reset history on long breaks to prevent average skewing
        if (dt > 1.0) {
            this.deltaHistory = []
        }
        
        this.deltaHistory.push(dt)
        if (this.deltaHistory.length > this.MAX_HISTORY) {
            this.deltaHistory.shift()
        }

        // We need a filled window to calculate stability accurately
        // Early notes use raw dt
        let effectiveNPS = 1 / dt

        if (this.deltaHistory.length >= 4) {
            const avgDt = this.deltaHistory.reduce((a, b) => a + b, 0) / this.deltaHistory.length
            const variance = calculateVariance(this.deltaHistory)
            const stdev = Math.sqrt(variance)
            
            // Coefficient of Variation (CV)
            // Low CV = Stable Stream (0.0 - 0.2)
            // High CV = Jitter/Gallop (> 0.3)
            const cv = stdev / avgDt

            // Speed calculation uses the windowed average to smooth out micro-pauses
            effectiveNPS = 1 / avgDt

            // STABILITY PENALTY
            // We penalize high variance patterns in the Stream skill.
            // Complex rhythms belong in Precision/Tech, not raw Speed.
            // 0.2 CV -> 1.0x multiplier
            // 0.5 CV -> 0.7x multiplier
            const stabilityPenalty = Math.max(0.4, 1.0 - (Math.max(0, cv - 0.1) * 1.5))
            effectiveNPS *= stabilityPenalty
        }

        // 2. Filter Validity
        if (row.notes.length > 1) return 0 // Chords are handled by ChordSkill

        const note = row.notes[0]
        const k = KEY_MAP[note.key]
        if (!k) return 0

        // Jack Filter: If same finger was used recently, it's a Jack, not Stream
        const fingerObj = context.fingerState.get(k.f)
        if (row.time - fingerObj.lastTime < 180) {
            return 0 
        }

        // 3. Pattern Manipulation
        const { fingerState } = context
        let patternMod = this.patternAnalyzer.analyze(note, fingerState, row.time)
        
        // Apply Pattern Mod (Rolls are easier than Trills/Streams)
        if (patternMod < 1.0) {
            effectiveNPS *= Math.pow(patternMod, 2.5) 
        } else {
            // Slight boost for uncomfortable patterns, but capped
            effectiveNPS *= Math.min(1.1, patternMod)
        }

        // 4. Scaling
        // Logarithmic scaling starting from a base NPS
        const npsBase = 7.0
        if (effectiveNPS <= npsBase) return 0

        // Curve: Log2(NPS / Base) * Scale
        return Math.log2(effectiveNPS / npsBase) * 8.5
    }
}

module.exports = StreamSkill