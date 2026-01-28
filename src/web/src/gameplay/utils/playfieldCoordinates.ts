import { ROW_TOP, ROW_HOME, ROW_BOTTOM, KEY_TO_ROW, KEY_ORDER } from '../constants';

const CENTER_X = 50; 
const CENTER_Y = 50; 

const BASE_ROW_Y_OFFSETS: Record<number, number> = {
    [ROW_TOP]: -15,     
    [ROW_HOME]: 0,      
    [ROW_BOTTOM]: 15    
};

interface CoordinateOptions {
    row: number;
    key: string;
    rowOffsets?: [number, number, number];
    rowXOffsets?: [number, number, number];
    // Note: We don't need noteShape here unless it affects center position, which it currently doesn't (just rotation)
}

/**
 * Calculates the visual (X, Y) percentage coordinates for a note on the playfield.
 * Returns { x, y } where values are 0-100.
 */
export const getNoteCoordinates = ({ 
    row, 
    key, 
    rowOffsets = [0, 0, 0], 
    rowXOffsets = [0, 0, 0] 
}: CoordinateOptions) => {
    const lowerChar = key.toLowerCase();
    let targetRow = row;
    
    // Auto-detect row from key if possible
    if (KEY_TO_ROW[lowerChar] !== undefined) {
        targetRow = KEY_TO_ROW[lowerChar];
    }

    const rowKeys = KEY_ORDER[targetRow] || [];
    const keyIndex = rowKeys.indexOf(lowerChar);
    
    // Y-Axis Calculation
    const baseY = BASE_ROW_Y_OFFSETS[targetRow] || 0;
    // 1px user offset ~= 0.25% height (heuristic from Playfield)
    const userOffsetY = (rowOffsets[targetRow] || 0) * 0.25;

    // X-Axis Calculation
    const userOffsetX = (rowXOffsets[targetRow] || 0);

    if (keyIndex !== -1) {
        const rowWidth = rowKeys.length;
        // 8% per key spacing
        const xOffsetPct = ((keyIndex - (rowWidth / 2)) + 0.5) * 8; 
        
        let rowStagger = 0;
        if (targetRow === ROW_HOME) rowStagger = 2; 
        if (targetRow === ROW_BOTTOM) rowStagger = 4;

        return {
            x: CENTER_X + xOffsetPct + rowStagger + userOffsetX,
            y: CENTER_Y + baseY + userOffsetY
        };
    } else {
        // Fallback center for row
        return { 
            x: CENTER_X + userOffsetX, 
            y: CENTER_Y + baseY + userOffsetY 
        };
    }
};