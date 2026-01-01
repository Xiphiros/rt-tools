const { ROW_HOME } = require('../constants')

/**
 * Tracks the physical state of the player's hands over time.
 * Essential for detecting Same Finger Bigrams (Jacks) and Independence.
 */
class FingerState {
    constructor() {
        this.fingers = new Array(8).fill(null).map(() => ({
            lastTime: -1000,
            lastRow: ROW_HOME,
            lastCol: 0,
            freeAt: -1000 // Timestamp when the finger is done holding a note
        }))
    }

    /**
     * Update the state of a specific finger
     */
    update(fingerIdx, time, row, col, duration = 0) {
        if (fingerIdx < 0 || fingerIdx >= 8) return

        const finger = this.fingers[fingerIdx]
        finger.lastTime = time
        finger.lastRow = row
        finger.lastCol = col
        finger.freeAt = time + duration
    }

    get(fingerIdx) {
        return this.fingers[fingerIdx]
    }

    /**
     * Check how many OTHER fingers are currently occupied (holding a note).
     * Used to calculate "Handstream" or "Finger Independence" difficulty.
     */
    getHoldingCount(currentTime, excludeFingerIdx) {
        let count = 0
        const tolerance = 0.01 // 10ms tolerance for release timing
        for (let i = 0; i < 8; i++) {
            if (i === excludeFingerIdx) continue
            if (this.fingers[i].freeAt > currentTime + tolerance) {
                count++
            }
        }
        return count
    }
}

module.exports = FingerState