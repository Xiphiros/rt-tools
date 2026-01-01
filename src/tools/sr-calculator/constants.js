// Define physical mapping of the keyboard
const FINGER_L_PINKY = 0
const FINGER_L_RING = 1
const FINGER_L_MIDDLE = 2
const FINGER_L_INDEX = 3
const FINGER_R_INDEX = 4
const FINGER_R_MIDDLE = 5
const FINGER_R_RING = 6
const FINGER_R_PINKY = 7

const HAND_LEFT = 0
const HAND_RIGHT = 1

const ROW_TOP = 1
const ROW_HOME = 0
const ROW_BOT = -1

const FINGER_DATA = {
    [FINGER_L_PINKY]: { strength: 1.3, hand: HAND_LEFT, name: 'L_Pinky' },
    [FINGER_L_RING]: { strength: 1.1, hand: HAND_LEFT, name: 'L_Ring' },
    [FINGER_L_MIDDLE]: { strength: 1.0, hand: HAND_LEFT, name: 'L_Middle' },
    [FINGER_L_INDEX]: { strength: 0.9, hand: HAND_LEFT, name: 'L_Index' },
    [FINGER_R_INDEX]: { strength: 0.9, hand: HAND_RIGHT, name: 'R_Index' },
    [FINGER_R_MIDDLE]: { strength: 1.0, hand: HAND_RIGHT, name: 'R_Middle' },
    [FINGER_R_RING]: { strength: 1.1, hand: HAND_RIGHT, name: 'R_Ring' },
    [FINGER_R_PINKY]: { strength: 1.3, hand: HAND_RIGHT, name: 'R_Pinky' },
}

// Map characters to physical coordinates (Finger, Row, X-Offset)
// X-Offset is relative to the center of the keyboard (between G and H)
const KEY_MAP = {
    '1': { f: FINGER_L_PINKY, r: ROW_TOP, x: -5 },
    'q': { f: FINGER_L_PINKY, r: ROW_TOP, x: -4.5 },
    'a': { f: FINGER_L_PINKY, r: ROW_HOME, x: -4 },
    'z': { f: FINGER_L_PINKY, r: ROW_BOT, x: -3.5 },

    '2': { f: FINGER_L_RING, r: ROW_TOP, x: -4 },
    'w': { f: FINGER_L_RING, r: ROW_TOP, x: -3.5 },
    's': { f: FINGER_L_RING, r: ROW_HOME, x: -3 },
    'x': { f: FINGER_L_RING, r: ROW_BOT, x: -2.5 },

    '3': { f: FINGER_L_MIDDLE, r: ROW_TOP, x: -3 },
    'e': { f: FINGER_L_MIDDLE, r: ROW_TOP, x: -2.5 },
    'd': { f: FINGER_L_MIDDLE, r: ROW_HOME, x: -2 },
    'c': { f: FINGER_L_MIDDLE, r: ROW_BOT, x: -1.5 },

    '4': { f: FINGER_L_INDEX, r: ROW_TOP, x: -2 },
    '5': { f: FINGER_L_INDEX, r: ROW_TOP, x: -1 },
    'r': { f: FINGER_L_INDEX, r: ROW_TOP, x: -1.5 },
    't': { f: FINGER_L_INDEX, r: ROW_TOP, x: -0.5 },
    'f': { f: FINGER_L_INDEX, r: ROW_HOME, x: -1 },
    'g': { f: FINGER_L_INDEX, r: ROW_HOME, x: 0 },
    'v': { f: FINGER_L_INDEX, r: ROW_BOT, x: -0.5 },
    'b': { f: FINGER_L_INDEX, r: ROW_BOT, x: 0.5 },

    '6': { f: FINGER_R_INDEX, r: ROW_TOP, x: 1 },
    '7': { f: FINGER_R_INDEX, r: ROW_TOP, x: 2 },
    'y': { f: FINGER_R_INDEX, r: ROW_TOP, x: 0.5 },
    'u': { f: FINGER_R_INDEX, r: ROW_TOP, x: 1.5 },
    'h': { f: FINGER_R_INDEX, r: ROW_HOME, x: 1 },
    'j': { f: FINGER_R_INDEX, r: ROW_HOME, x: 2 },
    'n': { f: FINGER_R_INDEX, r: ROW_BOT, x: 1.5 },
    'm': { f: FINGER_R_INDEX, r: ROW_BOT, x: 2.5 },

    '8': { f: FINGER_R_MIDDLE, r: ROW_TOP, x: 3 },
    'i': { f: FINGER_R_MIDDLE, r: ROW_TOP, x: 2.5 },
    'k': { f: FINGER_R_MIDDLE, r: ROW_HOME, x: 3 },
    ',': { f: FINGER_R_MIDDLE, r: ROW_BOT, x: 3.5 },

    '9': { f: FINGER_R_RING, r: ROW_TOP, x: 4 },
    'o': { f: FINGER_R_RING, r: ROW_TOP, x: 3.5 },
    'l': { f: FINGER_R_RING, r: ROW_HOME, x: 4 },
    '.': { f: FINGER_R_RING, r: ROW_BOT, x: 4.5 },

    '0': { f: FINGER_R_PINKY, r: ROW_TOP, x: 5 },
    'p': { f: FINGER_R_PINKY, r: ROW_TOP, x: 4.5 },
    ';': { f: FINGER_R_PINKY, r: ROW_HOME, x: 5 },
    '/': { f: FINGER_R_PINKY, r: ROW_BOT, x: 5.5 },
}

module.exports = {
    FINGER_DATA,
    KEY_MAP,
    ROW_HOME,
    HAND_LEFT,
    HAND_RIGHT,
    ROW_TOP,
    ROW_BOT
}