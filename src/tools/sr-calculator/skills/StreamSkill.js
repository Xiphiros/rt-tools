const Skill = require('./Skill')
const PatternAnalyzer = require('../utils/PatternAnalyzer')
const { KEY_MAP } = require('../constants')

class StreamSkill extends Skill {
    constructor() {
        super(0.15)
        this.patternAnalyzer = new PatternAnalyzer()
    }

    calculateNoteStrain(row, prevRow, context) {
        if (!prevRow) return 0

        const dt = Math.max((row.time - prevRow.time) / 1000, 0.015) 
        const nps = 1 / dt

        if (row.notes.length > 1) return 0

        const note = row.notes[0]
        const k = KEY_MAP[note.key]
        if (!k) return 0

        // JACK FILTER
        // If the same finger was used recently, this is a Jack, not a Stream.
        const fingerObj = context.fingerState.get(k.f)
        if (row.time - fingerObj.lastTime < 200) { // 200ms = 5 NPS
            return 0 
        }

        const { fingerState } = context
        let patternMod = this.patternAnalyzer.analyze(note, fingerState, row.time)
        
        // ROLL PUNISHMENT
        let effectiveNPS = nps
        if (patternMod < 0.6) {
            effectiveNPS *= Math.pow(patternMod, 3.0) 
        } else if (patternMod < 1.0) {
            effectiveNPS *= patternMod
        }

        const npsBase = 9.0
        let npsStrain = 0
        if (effectiveNPS > npsBase) {
            npsStrain = Math.log2(effectiveNPS / npsBase) * 7.0
        }

        return npsStrain
    }
}

module.exports = StreamSkill