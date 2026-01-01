const { FINGER_DATA, KEY_MAP } = require('../constants')

/**
 * Advanced Biomechanical Path Analyzer.
 * Detects ballistic "rolls" (comfortable typing sequences) vs. technical "conflicts".
 */
class PatternAnalyzer {
    constructor() {
        this.history = []
        this.MAX_HISTORY = 16 // Increased window for multi-cycle roll detection
        this.handStreaks = { 
            0: { vector: 0, count: 0 }, 
            1: { vector: 0, count: 0 } 
        }
    }

    analyze(note, fingerState, time) {
        const keyData = KEY_MAP[note.key]
        if (!keyData) return 1.0

        const finger = keyData.f
        const hand = FINGER_DATA[finger].hand
        let mod = 1.0

        const otherHand = hand === 0 ? 1 : 0
        if (this._isHandHolding(otherHand, fingerState, time) && !this._isHandActive(otherHand, time)) {
            mod *= 0.35 // Extreme discount for "Anchored" stability
        }

        const handHistory = this._getHandHistory(hand)
        if (handHistory.length > 0) {
            const lastNote = handHistory[handHistory.length - 1]
            const prevFinger = KEY_MAP[lastNote.key].f
            const fingerDist = Math.abs(finger - prevFinger)

            if (fingerDist === 1) {
                // DIRECTIONAL STREAK (The "Make a Move" Roll)
                const currentVector = finger - prevFinger
                const streak = this.handStreaks[hand]

                if (currentVector === streak.vector) {
                    streak.count++
                } else {
                    streak.vector = currentVector
                    streak.count = 1
                }

                // Deep asymptotic discount for directional rolls
                // 1st note = 0.3x, 2nd = 0.15x, 3rd = 0.08x, etc.
                mod *= (0.35 * Math.pow(0.55, Math.min(streak.count, 6)))
            } else if (fingerDist === 0) {
                // REPETITION (Jack)
                mod *= 1.3 
                this.handStreaks[hand].count = 0
            } else {
                // DISJOINTED (Awkward transitions)
                mod *= 1.45
                this.handStreaks[hand].count = 0
            }
        } else {
            // ALTERNATION (Hand-to-Hand)
            // Typing is naturally designed for alternation.
            mod *= 0.45 
        }

        this._addToHistory(note, time)
        return mod
    }

    _isHandHolding(handIdx, fingerState, time) {
        const start = handIdx === 0 ? 0 : 4
        for (let i = start; i < start + 4; i++) {
            if (fingerState.get(i).freeAt > time + 5) return true 
        }
        return false
    }

    _isHandActive(handIdx, time) {
        const window = 250 // ms
        for (let i = this.history.length - 1; i >= 0; i--) {
            const hNote = this.history[i]
            if (time - hNote.time > window) break 
            const k = KEY_MAP[hNote.key]
            if (k && FINGER_DATA[k.f].hand === handIdx) return true
        }
        return false
    }

    _getHandHistory(handIdx) {
        return this.history.filter(h => {
            const k = KEY_MAP[h.key]
            return k && FINGER_DATA[k.f].hand === handIdx
        })
    }

    _addToHistory(note, time) {
        this.history.push({ key: note.key, time: time })
        if (this.history.length > this.MAX_HISTORY) this.history.shift()
    }
}

module.exports = PatternAnalyzer