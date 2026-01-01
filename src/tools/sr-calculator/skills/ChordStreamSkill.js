const Skill = require('./Skill')

class ChordStreamSkill extends Skill {
    constructor() {
        super(0.12)
        this.densityHistory = []
        this.MAX_HISTORY = 6 // Longer history to capture sustained density
    }

    calculateNoteStrain(row, prevRow, context) {
        if (!prevRow) return 0

        const dt = Math.max((row.time - prevRow.time) / 1000, 0.02)
        const nps = 1 / dt
        const currentDensity = row.notes.length

        this.densityHistory.push(currentDensity)
        if (this.densityHistory.length > this.MAX_HISTORY) {
            this.densityHistory.shift()
        }

        const avgDensity = this.densityHistory.reduce((a, b) => a + b, 0) / this.densityHistory.length

        // Threshold: Must be consistently dense to count
        if (avgDensity < 1.1) return 0

        // DENSITY WEIGHTING
        // 1.8^n
        // 2 notes: 3.24x
        // 3 notes: 5.83x
        // 4 notes: 10.5x
        const densityWeight = Math.pow(1.8, avgDensity)

        // SPEED WEIGHTING
        // High speed chords are exponential
        const speedWeight = Math.pow(nps, 1.1)

        return densityWeight * speedWeight * 0.20
    }
}

module.exports = ChordStreamSkill