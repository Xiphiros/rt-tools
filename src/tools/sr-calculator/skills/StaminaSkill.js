const Skill = require('./Skill')

class StaminaSkill extends Skill {
    constructor() {
        // High decay factor (close to 1.0) means strain persists for a long time.
        // 0.97 per note/row implies slow recovery.
        super(0.97) 
        this.history = []
        this.MAX_HISTORY = 10
    }

    calculateNoteStrain(row, prevRow, context) {
        if (!prevRow) return 0

        const dt = Math.max((row.time - prevRow.time) / 1000, 0.001)
        
        // 1. Calculate Local Intensity
        // We use a short window to determine the "Current Effort Level"
        this.history.push(dt)
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift()
        }

        const avgDt = this.history.reduce((a, b) => a + b, 0) / this.history.length
        const nps = 1 / avgDt
        const density = row.notes.length

        // Weighted Intensity
        // Chords drain stamina significantly faster than single notes
        const intensity = nps * Math.pow(density, 1.6)

        // 2. Threshold Mechanics
        // Stamina only accumulates if the intensity exceeds a baseline comfort zone.
        // Below this threshold, the player is effectively recovering (handled by base class decay).
        const EFFORT_THRESHOLD = 7.0 

        if (intensity <= EFFORT_THRESHOLD) {
            return 0
        }

        // 3. Accumulation
        // The amount added is proportional to how far above the threshold we are.
        // We multiply by dt to normalize accumulation rate over time (Area under curve).
        const excessIntensity = intensity - EFFORT_THRESHOLD
        
        // Tuning factor to map Intensity -> Strain units
        return excessIntensity * 0.08
    }
}

module.exports = StaminaSkill