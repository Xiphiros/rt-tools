const Skill = require('./Skill')
const { calculateEntropy } = require('../utils/math')

class PrecisionSkill extends Skill {
    constructor() {
        super(0.12)
        this.deltaHistory = []
        this.MAX_DELTA_HISTORY = 12
    }

    calculateNoteStrain(row, prevRow, context) {
        if (!prevRow) return 0

        const currDt = Math.max(1, row.time - prevRow.time)
        
        // RESET ON BREAK
        // If there's a gap > 300ms, reset history. 
        // Starting a new phrase is not a "complex rhythm".
        if (currDt > 300) {
             this.deltaHistory = []
             return 0
        }

        this.deltaHistory.push(currDt)
        if (this.deltaHistory.length > this.MAX_DELTA_HISTORY) {
            this.deltaHistory.shift()
        }

        if (this.deltaHistory.length < 2) return 0

        const prevDt = this.deltaHistory[this.deltaHistory.length - 2]
        
        // Sanity check for ratio calculation
        const ratio = Math.max(currDt, prevDt) / Math.min(currDt, prevDt)

        let ratioStrain = 0
        if (Math.abs(ratio - 1.0) < 0.05) ratioStrain = 0
        else if (Math.abs(ratio - 2.0) < 0.05) ratioStrain = 0.5
        else if (Math.abs(ratio - 4.0) < 0.05) ratioStrain = 1.0
        
        else if (Math.abs(ratio - 1.5) < 0.05) ratioStrain = 8.0 
        else if (Math.abs(ratio - 1.33) < 0.05) ratioStrain = 12.0
        else ratioStrain = 25.0 

        const entropy = calculateEntropy(this.deltaHistory)
        const entropyBonus = Math.pow(entropy, 3.0) * 35.0

        const nps = 1000 / currDt
        const speedBoost = Math.max(1.0, Math.pow(nps / 4, 0.6))

        return (ratioStrain + entropyBonus) * speedBoost
    }
}

module.exports = PrecisionSkill