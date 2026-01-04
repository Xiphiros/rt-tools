import React from 'react';
import { EditorNote } from '../types';
import { NOTE_SIZE, ROW_COLORS, ROW_TOP, ROW_HOME, ROW_BOTTOM } from '../../gameplay/constants';

interface MiniPlayfieldProps {
    notes: EditorNote[]; 
    scale?: number;
    className?: string; // Allow external resizing
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

export const MiniPlayfield = ({ notes, scale = 0.25, className = "w-96 h-48" }: MiniPlayfieldProps) => {
    
    const getKeyPosition = (row: number, char: string) => {
        const rowKeys = KEY_ORDER[row];
        const keyIndex = rowKeys.indexOf(char);
        const rowWidth = rowKeys.length;
        
        // Math: (KeyIndex - HalfWidth + 0.5) centers the row around 0.
        // Multiplier: 9% ensures 10 keys (9 gaps) fit within ~90% width (10 * 9 = 90).
        // Previous 12% was pushing keys off-screen (10 * 12 = 120%).
        const xOffsetPct = ((keyIndex - (rowWidth / 2)) + 0.5) * 9;

        // Stagger Logic (Percentage shift)
        let rowStagger = 0;
        if (row === ROW_HOME) rowStagger = 2; 
        if (row === ROW_BOTTOM) rowStagger = 4; 

        return {
            x: CENTER_X + xOffsetPct + rowStagger,
            y: CENTER_Y + (ROW_Y_OFFSETS[row] || 0)
        };
    };

    // Render Full Grid (Ghost Notes)
    const renderGrid = () => {
        const ghosts: React.ReactNode[] = [];
        
        [ROW_TOP, ROW_HOME, ROW_BOTTOM].forEach(row => {
            KEY_ORDER[row].forEach(char => {
                const isActive = notes.some(n => n.key.toLowerCase() === char && n.column === row);
                const pos = getKeyPosition(row, char);
                const size = NOTE_SIZE * scale;
                
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
        <div className={`bg-black/95 rounded-lg border border-white/10 shadow-2xl relative overflow-hidden flex-shrink-0 z-[100] ${className}`}>
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
                                    boxShadow: `0 0 ${size * 0.4}px ${color}`
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