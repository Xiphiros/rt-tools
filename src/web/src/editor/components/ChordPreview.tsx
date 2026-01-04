import { EditorNote } from '../types';
import { NOTE_SIZE, ROW_COLORS, ROW_TOP, ROW_HOME, ROW_BOTTOM } from '../../gameplay/constants';

interface ChordPreviewProps {
    notes: EditorNote[];
    scale?: number;
}

// Reuse layout constants from Playfield but scaled down
const CENTER_X = 50; // %
const CENTER_Y = 50; // %

const ROW_Y_OFFSETS: Record<number, number> = {
    [ROW_TOP]: -20,
    [ROW_HOME]: 0,
    [ROW_BOTTOM]: 20
};

// Simplified Key Mapping for visual placement only
const KEY_ORDER: Record<number, string[]> = {
    [ROW_TOP]: ['q','w','e','r','t','y','u','i','o','p'],
    [ROW_HOME]: ['a','s','d','f','g','h','j','k','l',';'],
    [ROW_BOTTOM]: ['z','x','c','v','b','n','m',',','.','/']
};

export const ChordPreview = ({ notes, scale = 0.4 }: ChordPreviewProps) => {
    // Filter duplicates (unlikely if unique IDs, but good safety)
    const uniqueNotes = notes;

    const getNotePosition = (note: EditorNote) => {
        const rowKeys = KEY_ORDER[note.column] || [];
        const keyIndex = rowKeys.indexOf(note.key.toLowerCase());
        const rowWidth = rowKeys.length;
        const xOffsetPct = ((keyIndex - (rowWidth / 2)) + 0.5) * 12; // Wider spacing for mini view

        let rowStagger = 0;
        if (note.column === ROW_HOME) rowStagger = 3;
        if (note.column === ROW_BOTTOM) rowStagger = 6;

        return {
            x: CENTER_X + xOffsetPct + rowStagger,
            y: CENTER_Y + (ROW_Y_OFFSETS[note.column] || 0)
        };
    };

    return (
        <div className="w-48 h-32 bg-black/90 rounded-lg border border-primary/50 shadow-2xl relative overflow-hidden flex-shrink-0 z-[100]">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-primary/20 flex items-center justify-center border-b border-primary/20">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                    Chord ({notes.length})
                </span>
            </div>

            {/* Mini Playfield */}
            <div className="absolute top-6 bottom-0 left-0 right-0">
                {uniqueNotes.map(note => {
                    const pos = getNotePosition(note);
                    // Safe cast for color
                    const colors = ROW_COLORS as Record<number, string>;
                    const color = colors[note.column] || '#fff';
                    const size = NOTE_SIZE * scale;

                    return (
                        <div 
                            key={note.id}
                            className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                            }}
                        >
                            <div 
                                className="rounded-full border-2 bg-black flex items-center justify-center"
                                style={{
                                    width: size,
                                    height: size,
                                    borderColor: color,
                                    boxShadow: `0 0 5px ${color}`
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