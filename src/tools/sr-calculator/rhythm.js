// Rhythm Score (RS) Constants
const ACC_PAR = 95.0;
const ACC_FLOOR = 80.0;
const MAX_BONUS = 1.30; // 130% of RR at 100% Acc

/**
 * Calculates the Rhythm Score (Performance Points) based on map difficulty (RR) and accuracy.
 * 
 * @param {Number} rr - Rhythm Rating (Star Rating of the map)
 * @param {Number} accuracy - Player accuracy (0-100)
 * @returns {Number} Rhythm Score value
 */
function calculateRS(rr, accuracy) {
    if (accuracy < ACC_FLOOR) return 0;

    if (accuracy < ACC_PAR) {
        // Punishment Curve (80% -> 0, 95% -> RR)
        // Drops off rapidly below 95% to discourage "mashing"
        const range = ACC_PAR - ACC_FLOOR;
        const progress = (accuracy - ACC_FLOOR) / range;
        return rr * Math.pow(progress, 1.5);
    } else {
        // Bonus Curve (95% -> RR, 100% -> RR * MAX_BONUS)
        // Quadratic lift for elite accuracy to reward perfection
        const range = 100 - ACC_PAR;
        const progress = (accuracy - ACC_PAR) / range;
        
        const bonus = (MAX_BONUS - 1.0) * Math.pow(progress, 2);
        return rr * (1.0 + bonus);
    }
}

module.exports = {
    calculateRS,
    CONSTANTS: {
        ACC_PAR,
        ACC_FLOOR,
        MAX_BONUS
    }
};