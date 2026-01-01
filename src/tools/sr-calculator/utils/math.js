function applyDecay(initialStrain, decayFactor, timeDelta) {
    return initialStrain * Math.pow(decayFactor, timeDelta)
}

function gcd(a, b) {
    if (!b) return a
    return gcd(b, a % b)
}

function approxEqual(a, b, epsilon = 0.01) {
    return Math.abs(a - b) < epsilon
}

function calculateVariance(values) {
    if (values.length < 2) return 0
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const deviation = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0)
    return deviation / values.length
}

function calculateEntropy(deltas) {
    if (deltas.length < 2) return 0
    let score = 0
    for (let i = 1; i < deltas.length; i++) {
        const ratio = Math.max(deltas[i], deltas[i - 1]) / Math.min(deltas[i], deltas[i - 1])
        score += Math.abs(Math.log2(ratio))
    }
    return score / deltas.length
}

module.exports = { 
    applyDecay, 
    gcd, 
    approxEqual, 
    calculateVariance, 
    calculateEntropy 
}