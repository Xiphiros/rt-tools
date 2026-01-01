const Skill = require('./Skill')
const PatternAnalyzer = require('../utils/PatternAnalyzer')
const { KEY_MAP, FINGER_DATA } = require('../constants')

/**
 * ERGONOMICS: Measures biomechanical awkwardness.
 * High strain for: Inversions, Split-Hands, Anchored Trills.
 * Low strain for: Alternation, Rolls.
 */
class ErgonomicsSkill extends Skill {
    constructor() {
        super(0.20)
        this.patternAnalyzer = new PatternAnalyzer()
    }

    calculateNoteStrain(row, prevRow, context) {
        if (!prevRow) return 0

        const { fingerState } = context
        let totalStrain = 0

        for (const note of row.notes) {
            const k = KEY_MAP[note.key]
            if (!k) continue

            // 1. Pattern Analysis (Roll vs Inversion)
            const patternMod = this.patternAnalyzer.analyze(note, fingerState, row.time)
            
            // If patternMod > 1.0, it's awkward -> Strain
            // If patternMod < 1.0, it's comfortable -> No Ergonomic Strain
            let awkwardness = 0
            if (patternMod > 1.1) {
                awkwardness = (patternMod - 1.0) * 10.0
            }

            // 2. Hand Independence / Sympathetic Strain
            const handIdx = FINGER_DATA[k.f].hand
            const startF = handIdx === 0 ? 0 : 4
            const endF = handIdx === 0 ? 3 : 7
            
            let interference = 0
            for (let i = startF; i <= endF; i++) {
                if (i === k.f) continue
                const other = fingerState.get(i)
                // If adjacent finger is holding a key, movement is restricted
                if (other.freeAt > row.time + 20) {
                    if (Math.abs(i - k.f) === 1) interference += 5.0
                    else interference += 2.0
                }
            }

            totalStrain += (awkwardness + interference)
        }

        return totalStrain
    }
}

module.exports = ErgonomicsSkill