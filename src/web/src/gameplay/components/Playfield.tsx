import React from 'react';
import { EditorMapData } from '../../editor/types';
import { NOTE_SIZE, ROW_COLORS, ROW_TOP, ROW_HOME, ROW_BOTTOM, KEY_TO_ROW } from '../constants';

interface PlayfieldProps {
    mapData: EditorMapData;
    currentTime: number; 
    playbackRate: number;
    showApproachCircles?: boolean;
    scale?: number;
}

const CENTER_X = 50; 
const CENTER_Y = 50; 

const ROW_Y_OFFSETS: Record<number, number> = {
    [ROW_TOP]: -15,    
    [ROW_HOME]: 0,     
    [ROW_BOTTOM]: 15   
};

// Default layout for ghosts
const KEY_ORDER: Record<number, string[]> = {
    [ROW_TOP]: ['q','w','e','r','t','y','u','i','o','p'],
    [ROW_HOME]: ['a','s','d','f','g','h','j','k','l',';'],
    [ROW_BOTTOM]: ['z','x','c','v','b','n','m',',','.','/']
};

export const Playfield = ({ mapData, currentTime, showApproachCircles = true, scale = 1.0 }: PlayfieldProps) => {
    const PREEMPT = 1200; 
    const FADE_OUT = 200;

    const visibleNotes = mapData.notes.filter(n => {
        const relativeTime = n.time - currentTime;
        const endTime = n.type === 'hold' ? n.time + (n.duration || 0) : n.time;
        // Extend visibility for holds to ensure they don't disappear while held
        return (relativeTime <= PREEMPT && (endTime - currentTime) >= -FADE_OUT);
    });

    const getPosition = (row: number, char: string) => {
        const lowerChar = char.toLowerCase();
        let targetRow = row;
        
        // Double check row if note.column might be wrong (importer logic)
        if (KEY_TO_ROW[lowerChar] !== undefined) {
            targetRow = KEY_TO_ROW[lowerChar];
        }

        const rowKeys = KEY_ORDER[targetRow] || [];
        const keyIndex = rowKeys.indexOf(lowerChar);
        
        if (keyIndex !== -1) {
            const rowWidth = rowKeys.length;
            const xOffsetPct = ((keyIndex - (rowWidth / 2)) + 0.5) * 8; 
            let rowStagger = 0;
            if (targetRow === ROW_HOME) rowStagger = 2;
            if (targetRow === ROW_BOTTOM) rowStagger = 4;

            return {
                x: CENTER_X + xOffsetPct + rowStagger,
                y: CENTER_Y + (ROW_Y_OFFSETS[targetRow] || 0)
            };
        } else {
            return { x: CENTER_X, y: CENTER_Y };
        }
    };

    const actualSize = NOTE_SIZE * scale;

    const renderGhosts = () => {
        const elements: React.ReactNode[] = [];
        [ROW_TOP, ROW_HOME, ROW_BOTTOM].forEach(row => {
            KEY_ORDER[row].forEach(char => {
                const pos = getPosition(row, char);
                elements.push(
                    <div 
                        key={`ghost-${char}`}
                        className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                        <div 
                            className="rounded-full border-2 border-white/5 bg-white/5 flex items-center justify-center"
                            style={{ width: actualSize, height: actualSize }}
                        >
                            <span className="font-bold text-white/10 font-mono" style={{ fontSize: actualSize * 0.4 }}>
                                {char.toUpperCase()}
                            </span>
                        </div>
                    </div>
                );
            });
        });
        return elements;
    };

    return (
        <div className="relative w-full h-full bg-black/40 overflow-hidden select-none pointer-events-none">
            <div className="absolute inset-0 opacity-10" 
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
            />

            {renderGhosts()}

            {visibleNotes.map(note => {
                const pos = getPosition(note.column, note.key);
                const relativeTime = note.time - currentTime;
                
                let opacity = 1;
                if (relativeTime > PREEMPT - 200) {
                    opacity = (PREEMPT - relativeTime) / 200;
                } else if (relativeTime < 0 && note.type !== 'hold') {
                    opacity = 1 - (Math.abs(relativeTime) / FADE_OUT);
                }

                const progress = 1 - (relativeTime / PREEMPT);
                const approachScale = 3 - (2 * progress);

                const colors = ROW_COLORS as Record<number, string>;
                const row = KEY_TO_ROW[note.key.toLowerCase()] ?? note.column;
                const color = colors[row] || '#fff';

                // Fix: Ensure zIndex is always positive and large enough so later notes are on top of earlier notes?
                // Actually, earlier notes should be on top visually if they overlap? 
                // Or later notes (closest to hit) on top? Usually later notes (closest to camera/judgment line).
                // But in this flat view, we just want them above the ghosts.
                // Using a large base ensures positive values.
                const zIndex = 100000000 - Math.floor(note.time);

                return (
                    <div 
                        key={note.id}
                        className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 will-change-transform"
                        style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            opacity: Math.max(0, opacity),
                            zIndex: zIndex
                        }}
                    >
                        <div 
                            className="rounded-full flex items-center justify-center shadow-lg"
                            style={{
                                width: actualSize,
                                height: actualSize,
                                backgroundColor: '#18181b',
                                border: `4px solid ${color}`,
                                boxShadow: `0 0 10px ${color}40`
                            }}
                        >
                            <span className="font-bold text-white font-mono drop-shadow-md" style={{ fontSize: actualSize * 0.4 }}>
                                {note.key.toUpperCase()}
                            </span>
                        </div>

                        {showApproachCircles && relativeTime > 0 && (
                            <div 
                                className="absolute rounded-full border-2"
                                style={{
                                    width: actualSize,
                                    height: actualSize,
                                    borderColor: color,
                                    opacity: 0.6,
                                    transform: `scale(${approachScale})`
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};