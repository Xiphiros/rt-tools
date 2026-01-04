import { EditorNote } from '../types';
import { NOTE_SIZE, ROW_COLORS, ROW_TOP, ROW_HOME, ROW_BOTTOM } from '../../gameplay/constants';

interface MiniPlayfieldProps {
    notes: EditorNote[]; // Active notes at this timestamp
    scale?: number;
}

const CENTER_X = 50; 
const CENTER_Y = 50; 

const ROW_Y_OFFSETS: Record<number, number> = {
    [ROW_TOP]: -20,
    [ROW_HOME]: 0,
    [ROW_BOTTOM]: 20
};

const KEY_ORDER: Record<number, string[]> = {
    [ROW_TOP]: ['q','w','e','r','t','y','u','i','o','p'],
    [ROW_HOME]: ['a','s','d','f','g','h','j','k','l',';'],
    [ROW_BOTTOM]: ['z','x','c','v','b','n','m',',','.','/']
};

export const MiniPlayfield = ({ notes, scale = 0.4 }: MiniPlayfieldProps) => {
    // Helper to calculate position for ANY key
    const getKeyPosition = (row: number, char: string) => {
        const rowKeys = KEY_ORDER[row];
        const keyIndex = rowKeys.indexOf(char);
        const rowWidth = rowKeys.length;
        const xOffsetPct = ((keyIndex - (rowWidth / 2)) + 0.5) * 12;

        let rowStagger = 0;
        if (row === ROW_HOME) rowStagger = 3;
        if (row === ROW_BOTTOM) rowStagger = 6;

        return {
            x: CENTER_X + xOffsetPct + rowStagger,
            y: CENTER_Y + (ROW_Y_OFFSETS[row] || 0)
        };
    };

    // Render Full Grid (Ghost Notes)
    const renderGrid = () => {
        const ghosts = [];
        [ROW_TOP, ROW_HOME, ROW_BOTTOM].forEach(row => {
            KEY_ORDER[row].forEach(char => {
                // Check if this key is active
                const isActive = notes.some(n => n.key.toLowerCase() === char && n.column === row);
                const pos = getKeyPosition(row, char);
                const size = NOTE_SIZE * scale;
                
                // If active, we render it later on top. 
                // If inactive, render ghost.
                if (!isActive) {
                    ghosts.push(
                        <div 
                            key={`ghost-${char}`}
                            className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        >
                            <div 
                                className="rounded-full border border-white/10 bg-white/5 flex items-center justify-center"
                                style={{ width: size, height: size }}
                            >
                                <span className="text-white/20 font-bold" style={{ fontSize: size * 0.5 }}>
                                    {char.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    );
                }
            });
        });
        return ghosts;
    };

    return (
        <div className="w-64 h-40 bg-black/90 rounded-lg border border-white/20 shadow-2xl relative overflow-hidden flex-shrink-0 z-[100]">
            <div className="absolute top-0 left-0 right-0 h-6 bg-white/5 flex items-center justify-center border-b border-white/10">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                    Preview
                </span>
            </div>

            <div className="absolute top-6 bottom-0 left-0 right-0">
                {/* 1. Ghost Layer */}
                {renderGrid()}

                {/* 2. Active Layer */}
                {notes.map(note => {
                    const pos = getKeyPosition(note.column, note.key.toLowerCase());
                    const colors = ROW_COLORS as Record<number, string>;
                    const color = colors[note.column] || '#fff';
                    const size = NOTE_SIZE * scale;

                    return (
                        <div 
                            key={note.id}
                            className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        >
                            <div 
                                className="rounded-full border-2 bg-black flex items-center justify-center"
                                style={{
                                    width: size,
                                    height: size,
                                    borderColor: color,
                                    boxShadow: `0 0 8px ${color}`
                                }}
                            >
                                <span className="text-white font-bold" style={{ fontSize: size * 0.6 }}>
                                    {note.key.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};