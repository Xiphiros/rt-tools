const FingerState = require('./models/FingerState')
const { normalizeNotes, aggregatePeaks } = require('./utils/normalization')
const { KEY_MAP } = require('./constants')
const { snapNotes } = require('./utils/ModUtils') // Import Snapping Utility

const StreamSkill = require('./skills/StreamSkill')
const JackSpeedSkill = require('./skills/JackSpeedSkill')
const ChordStreamSkill = require('./skills/ChordStreamSkill')
const PrecisionSkill = require('./skills/PrecisionSkill')
const ErgonomicsSkill = require('./skills/ErgonomicsSkill')
const DisplacementSkill = require('./skills/DisplacementSkill')
const StaminaSkill = require('./skills/StaminaSkill')

class Calculator {
    constructor() {
        this.skills = {
            stream: new StreamSkill(),
            jack: new JackSpeedSkill(),
            chord: new ChordStreamSkill(),
            prec: new PrecisionSkill(),
            ergo: new ErgonomicsSkill(),
            disp: new DisplacementSkill(),
            stam: new StaminaSkill()
        }
    }

    /**
     * @param {Array} rawNotes 
     * @param {Number} overallDifficulty 
     * @param {Boolean} returnPeaks - If true, returns raw strain arrays for graphing
     */
    calculate(rawNotes, overallDifficulty = 5, returnPeaks = false) {
        // 1. SNAP NOTES (Fix for <20ms flams being treated as streams)
        const snappedNotes = snapNotes(rawNotes)

        // 2. Normalize (Convert to rows)
        const rows = normalizeNotes(snappedNotes)
        if (rows.length === 0) return this.emptyResult()

        const firstNoteTime = rows[0].time
        const lastNoteTime = rows[rows.length - 1].time
        const drainTime = (lastNoteTime - firstNoteTime) / 1000

        // 3. Initialize Skills
        for (const skill of Object.values(this.skills)) {
            skill.setStartTime(firstNoteTime)
        }

        const fingerState = new FingerState()
        const context = { fingerState, prevDtMs: 0 }

        let prevRow = null
        for (const row of rows) {
            // Filter out invalid keys if any
            row.notes = row.notes.filter(n => KEY_MAP[n.key])
            if (row.notes.length === 0 && rows.length > 1) continue

            // Process Strain
            for (const skill of Object.values(this.skills)) {
                skill.process(row, prevRow, context)
            }

            // Update Physical State
            for (const note of row.notes) {
                const k = KEY_MAP[note.key]
                if (k) fingerState.update(k.f, row.time, k.r, k.x, note.duration)
            }
            prevRow = row
        }

        // 4. Aggregation
        const aggregated = {}
        const rawPeaks = {}

        for (const [name, skill] of Object.entries(this.skills)) {
            const peaks = skill.finalize()
            if (returnPeaks) rawPeaks[name] = peaks
            
            // Chord/Stamina use slower decay to reward consistency
            const decay = (name === 'stam' || name === 'chord') ? 0.94 : 0.72
            aggregated[name] = aggregatePeaks(peaks, decay)
        }

        const results = this.weighResults(aggregated, overallDifficulty, drainTime)
        
        if (returnPeaks) {
            results.peaks = rawPeaks
        }
        
        return results
    }

    weighResults(raw, od, drainTime) {
        const odScale = 1 + 0.04 * (od - 5)
        
        // Final Scaling Factors
        const stream = Math.sqrt(raw.stream) * 0.50
        const jack = Math.sqrt(raw.jack) * 0.65
        const chord = Math.sqrt(raw.chord) * 0.75
        const prec = Math.sqrt(raw.prec) * 0.60 * odScale
        const ergo = Math.sqrt(raw.ergo) * 0.55
        const disp = Math.sqrt(raw.disp) * 0.50
        const stam = Math.sqrt(raw.stam) * 0.60

        // Sort skills by intensity to determine the "Main Focus" vs "Secondary Factors"
        const skills = [stream, jack, chord, prec, ergo, disp, stam].sort((a, b) => b - a)
        
        // Flattened Manifold (Strongest Link + Diminishing Returns)
        let total = skills[0]
        if (skills[1]) total += skills[1] * 0.95
        if (skills[2]) total += skills[2] * 0.85
        if (skills[3]) total += skills[3] * 0.75
        if (skills[4]) total += skills[4] * 0.65
        if (skills[5]) total += skills[5] * 0.55
        if (skills[6]) total += skills[6] * 0.45

        return {
            total,
            details: { stream, jack, chord, prec, ergo, disp, stam },
            metadata: { 
                drainTime,
                firstNoteTime: this.skills.stream.currentSectionEnd ? this.skills.stream.currentSectionEnd - this.skills.stream.sectionLength : 0
            }
        }
    }

    emptyResult() {
        return { 
            total: 0, 
            details: { stream: 0, jack: 0, chord: 0, prec: 0, ergo: 0, disp: 0, stam: 0 } 
        }
    }
}

function calculateStrain(rawNotes, overallDifficulty, returnPeaks = false) {
    const calc = new Calculator()
    return calc.calculate(rawNotes, overallDifficulty, returnPeaks)
}

module.exports = { calculateStrain }