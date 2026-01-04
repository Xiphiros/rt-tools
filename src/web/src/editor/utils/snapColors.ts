// osu! Editor Snap Colors
// 1/1: White
// 1/2: Red
// 1/3: Purple
// 1/4: Blue
// 1/6: Purple (Lighter) or standard Purple
// 1/8: Yellow
// 1/12: Gray/Teal
// 1/16: Dark Gray

export const SNAP_COLORS: Record<number, string> = {
    1: '#FFFFFF', // 1/1
    2: '#EF4444', // 1/2 (Red-500)
    3: '#A855F7', // 1/3 (Purple-500)
    4: '#3B82F6', // 1/4 (Blue-500)
    6: '#D8B4FE', // 1/6 (Purple-300)
    8: '#EAB308', // 1/8 (Yellow-500)
    12: '#14B8A6', // 1/12 (Teal-500)
    16: '#6B7280', // 1/16 (Gray-500)
};

/**
 * Returns the divisor key for a given beat index if it matches a snap.
 * E.g., beat 0.5 matches 1/2 snap (divisor 2).
 */
export const getSnapDivisor = (beatIndex: number): number => {
    // Floating point tolerance
    const EPSILON = 0.001;
    
    const isInt = (n: number) => Math.abs(n - Math.round(n)) < EPSILON;

    if (isInt(beatIndex)) return 1;
    if (isInt(beatIndex * 2)) return 2;
    if (isInt(beatIndex * 3)) return 3;
    if (isInt(beatIndex * 4)) return 4;
    if (isInt(beatIndex * 6)) return 6;
    if (isInt(beatIndex * 8)) return 8;
    if (isInt(beatIndex * 12)) return 12;
    if (isInt(beatIndex * 16)) return 16;
    
    return 0; // Unsnapped or finer than 1/16
};

export const getSnapColor = (divisor: number): string => {
    return SNAP_COLORS[divisor] || '#333';
};