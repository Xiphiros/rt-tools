// Physical Layout Definitions

export const ROW_TOP = 0;
export const ROW_HOME = 1;
export const ROW_BOTTOM = 2;

export const ROW_HEIGHT = 80; // px
export const NOTE_SIZE = 64;  // px (Diameter)

// Mapping characters to their physical rows
// This allows the editor to automatically place 'Q' in row 0 and 'A' in row 1
export const KEY_TO_ROW: Record<string, number> = {
    // Top Row
    'q': ROW_TOP, 'w': ROW_TOP, 'e': ROW_TOP, 'r': ROW_TOP, 't': ROW_TOP,
    'y': ROW_TOP, 'u': ROW_TOP, 'i': ROW_TOP, 'o': ROW_TOP, 'p': ROW_TOP,
    '[': ROW_TOP, ']': ROW_TOP,

    // Home Row
    'a': ROW_HOME, 's': ROW_HOME, 'd': ROW_HOME, 'f': ROW_HOME, 'g': ROW_HOME,
    'h': ROW_HOME, 'j': ROW_HOME, 'k': ROW_HOME, 'l': ROW_HOME, ';': ROW_HOME,
    '\'': ROW_HOME,

    // Bottom Row
    'z': ROW_BOTTOM, 'x': ROW_BOTTOM, 'c': ROW_BOTTOM, 'v': ROW_BOTTOM,
    'b': ROW_BOTTOM, 'n': ROW_BOTTOM, 'm': ROW_BOTTOM, ',': ROW_BOTTOM,
    '.': ROW_BOTTOM, '/': ROW_BOTTOM
};

export const ROW_LABELS = [
    "QWERTY",
    "ASDFGH",
    "ZXCVBN"
];

export const ROW_COLORS = {
    [ROW_TOP]: '#38bdf8',    // Sky
    [ROW_HOME]: '#c084fc',   // Purple
    [ROW_BOTTOM]: '#f472b6'  // Pink
};