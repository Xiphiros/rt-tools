const Skill = require('./Skill')

class StaminaSkill extends Skill {
    constructor() {
        // EXTREMELY slow decay.
        // Fatigue takes seconds/minutes to recover, not milliseconds.
        super(0.015) 
    }

    calculateNoteStrain(row, prevRow, context) {
        if (!prevRow) return 0

        const dt = Math.max((row.time - prevRow.time) / 1000, 0.01)
        const nps = 1 / dt
        
        // DENSITY FATIGUE
        const density = row.notes.length
        
        // Strain = NPS * Density ^ 1.8
        // 2 notes is nearly 4x harder on energy than 1 note (coordination + force)
        let currentStrain = nps * Math.pow(density, 1.8)

        if (currentStrain <= 5) return 0

        // Linear Accumulation
        return (currentStrain - 5) * 0.15
    }
}

module.exports = StaminaSkill