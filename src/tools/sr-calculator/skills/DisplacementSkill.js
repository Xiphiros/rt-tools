const Skill = require('./Skill')
const { KEY_MAP, ROW_HOME, FINGER_DATA } = require('../constants')

class DisplacementSkill extends Skill {
    constructor() {
        super(0.20)
    }

    calculateNoteStrain(row, prevRow, context) {
        if (!prevRow) return 0

        const { fingerState } = context
        let totalStrain = 0
        let rowMoveDirections = 0 // Track net direction of movement

        for (const note of row.notes) {
            const k = KEY_MAP[note.key]
            if (!k) continue

            const fingerObj = fingerState.get(k.f)
            const timeSinceLastUse = row.time - fingerObj.lastTime

            // 1. VERTICAL JACK
            if (timeSinceLastUse < 250) {
                const rowDist = Math.abs(k.r - fingerObj.lastRow)
                if (rowDist > 0) {
                    let slideCost = Math.pow(4.0, rowDist) 
                    const speedFactor = 250 / Math.max(40, timeSinceLastUse)
                    totalStrain += (slideCost * speedFactor * 2.0)
                    
                    // Track Direction (Up or Down)
                    if (k.r > fingerObj.lastRow) rowMoveDirections++
                    else rowMoveDirections--
                }
            } else {
                // 2. STANDARD JUMP
                const startRow = timeSinceLastUse > 600 ? ROW_HOME : fingerObj.lastRow
                const rowDist = Math.abs(k.r - startRow)
                
                if (rowDist >= 2) totalStrain += 4.0 
                else if (rowDist >= 1) totalStrain += 1.2
            }
        }

        // 3. SUSTAINED MOVEMENT BONUS (STAIRS)
        // Only trigger bonus if movement is UNIDIRECTIONAL (e.g., all fingers moving Up or all Down)
        // This targets Q-W-E-R stairs while ignoring "Jitter" chords (Q+Z).
        if (Math.abs(rowMoveDirections) > 1) { 
            totalStrain *= 1.35
        }

        return totalStrain
    }
}

module.exports = DisplacementSkill