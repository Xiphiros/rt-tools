const { applyDecay } = require('../utils/math')

/**
 * Abstract base class for a specific Strain Dimension.
 * Handles the strain decay and sectioning logic common to all skills.
 */
class Skill {
    constructor(decayFactor) {
        this.currentStrain = 0
        this.decayFactor = decayFactor
        this.peaks = []
        this.sectionLength = 400 // 400ms sections for peak tracking
        this.currentSectionEnd = null // Initialized dynamically based on map start
    }

    /**
     * Process a note and return the raw strain added.
     * Must be implemented by subclasses.
     */
    calculateNoteStrain(row, prevRow, context) {
        throw new Error("Method 'calculateNoteStrain' must be implemented.")
    }

    /**
     * Sets the starting point for sectioning.
     * This aligns the graph's T=0 with the map's first note.
     */
    setStartTime(startTime) {
        this.currentSectionEnd = startTime + this.sectionLength
    }

    /**
     * Updates the skill state with a new row.
     */
    process(row, prevRow, context) {
        const time = row.time
        
        // Auto-initialize start time if not set manually
        if (this.currentSectionEnd === null) {
            this.setStartTime(time)
        }

        const dt = prevRow ? Math.max((time - prevRow.time) / 1000, 0.001) : 1.0

        // Apply decay since last row
        this.currentStrain = applyDecay(this.currentStrain, this.decayFactor, dt)

        // Add specific strain for this row
        this.currentStrain += this.calculateNoteStrain(row, prevRow, context)

        // Save peaks for sectioning
        // This effectively "bins" the strain into 400ms chunks starting from the first note
        while (time > this.currentSectionEnd) {
            this.peaks.push(this.currentStrain)
            this.currentSectionEnd += this.sectionLength
        }
    }

    /**
     * Handles the final flush of peaks at map end
     */
    finalize() {
        this.peaks.push(this.currentStrain)
        return this.peaks
    }
}

module.exports = Skill