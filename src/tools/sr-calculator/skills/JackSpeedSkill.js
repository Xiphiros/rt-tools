const Skill = require('./Skill')
const { KEY_MAP } = require('../constants')

class JackSpeedSkill extends Skill {
    constructor() {
        super(0.20)
    }

    calculateNoteStrain(row, prevRow, context) {
        if (!prevRow) return 0

        let jackStrain = 0
        
        for (const n of row.notes) {
            const k = KEY_MAP[n.key]
            if (!k) continue

            const fingerObj = context.fingerState.get(k.f)
            const fingerDt = (row.time - fingerObj.lastTime) / 1000
            
            // WIDENED THRESHOLD
            // Was 0.13 (130ms / 7.7 NPS). Now 0.18 (180ms / 5.5 NPS).
            // This captures slower jacks (like the 147ms ones in Overmomochi Hyper).
            if (fingerDt > 0.01 && fingerDt < 0.18) {
                const jackNPS = 1 / fingerDt
                const cappedNPS = Math.min(jackNPS, 18.0)
                
                // Curve: (NPS - 5)^2.5
                // Gentler start curve to avoid over-punishing 5.5 NPS jacks, 
                // but still scaling hard for 10+ NPS.
                jackStrain += Math.pow(Math.max(0, cappedNPS - 5), 2.5) / 15.0
            }
        }

        return jackStrain
    }
}

module.exports = JackSpeedSkill