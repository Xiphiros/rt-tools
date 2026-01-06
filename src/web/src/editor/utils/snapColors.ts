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
    1: '#FFFFFF',  // 1/1
    2: '#EF4444',  // 1/2 (Red-500)
    3: '#A855F7',  // 1/3 (Purple-500)
    4: '#3B82F6',  // 1/4 (Blue-500)
    5: '#FB923C',  // 1/5 (Orange-400)
    6: '#D8B4FE',  // 1/6 (Purple-300)
    7: '#22C55E',  // 1/7 (Green-500)
    8: '#EAB308',  // 1/8 (Yellow-500)
    9: '#EC4899',  // 1/9 (Pink-500)
    10: '#9CA3AF', // 1/10 (Gray-400) - often similiar to 1/5 but finer
    12: '#14B8A6', // 1/12 (Teal-500)
    16: '#6B7280', // 1/16 (Gray-500)
};

export const COMMON_SNAPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16];

/**
 * Returns the divisor key for a given beat index if it matches a snap.
 * E.g., beat 0.5 matches 1/2 snap (divisor 2).
 */
export const getSnapDivisor = (beatIndex: number): number => {
    // Relaxed tolerance to handle Integer Millisecond rounding errors from imports.
    // Example: At 186 BPM (322.58ms/beat), a 1ms drift results in ~0.003 beat deviation.
    const EPSILON = 0.015;
    
    const isInt = (n: number) => Math.abs(n - Math.round(n)) < EPSILON;

    // Check standard standard & triplet first (Optimization)
    if (isInt(beatIndex)) return 1;
    if (isInt(beatIndex * 2)) return 2;
    if (isInt(beatIndex * 3)) return 3;
    if (isInt(beatIndex * 4)) return 4;
    
    // Uneven / Higher precision
    if (isInt(beatIndex * 5)) return 5;
    if (isInt(beatIndex * 6)) return 6;
    if (isInt(beatIndex * 7)) return 7;
    if (isInt(beatIndex * 8)) return 8;
    if (isInt(beatIndex * 9)) return 9;
    if (isInt(beatIndex * 10)) return 10;
    if (isInt(beatIndex * 12)) return 12;
    if (isInt(beatIndex * 16)) return 16;
    
    return 0; // Unsnapped or finer than 1/16
};

export const getSnapColor = (divisor: number): string => {
    return SNAP_COLORS[divisor] || '#333';
};