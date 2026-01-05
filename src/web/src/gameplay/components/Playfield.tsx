import React from 'react';
import { EditorMapData, EditorNote } from '../../editor/types';
import { NOTE_SIZE, ROW_COLORS, ROW_TOP, ROW_HOME, ROW_BOTTOM, KEY_TO_ROW } from '../constants';

interface PlayfieldProps {
    mapData: EditorMapData;
    currentTime: number; 
    playbackRate: number;
    showApproachCircles?: boolean;
    scale?: number;
    
    // Editor Interactions
    onNoteClick?: (e: React.MouseEvent, note: EditorNote) => void;
    onBackgroundClick?: (e: React.MouseEvent) => void;
}

const CENTER_X = 50; 
const CENTER_Y = 50; 

const ROW_Y_OFFSETS: Record<number, number> = {
    [ROW_TOP]: -15,    
    [ROW_HOME]: 0,     
    [ROW_BOTTOM]: 15   
};

const KEY_ORDER: Record<number, string[]> = {
    [ROW_TOP]: ['q','w','e','r','t','y','u','i','o','p'],
    [ROW_HOME]: ['a','s','d','f','g','h','j','k','l',';'],
    [ROW_BOTTOM]: ['z','x','c','v','b','n','m',',','.','/']
};

export const Playfield = ({ 
    mapData, 
    currentTime, 
    showApproachCircles = true, 
    scale = 1.0,
    onNoteClick,
    onBackgroundClick
}: PlayfieldProps) => {
    const PREEMPT = 1200; 
    const FADE_OUT = 200;

    const visibleNotes = mapData.notes.filter(n => {
        const relativeTime = n.time - currentTime;
        const endTime = n.type === 'hold' ? n.time + (n.duration || 0) : n.time;
        return (relativeTime <= PREEMPT && (endTime - currentTime) >= -FADE_OUT);
    });

    const getPosition = (row: number, char: string) => {
        const lowerChar = char.toLowerCase();
        let targetRow = row;
        
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

    const handleBgClick = (e: React.MouseEvent) => {
        if (onBackgroundClick) onBackgroundClick(e);
    };

    return (
        // "isolate" creates a new stacking context. 
        // Any massive Z-indices inside here are flattened relative to the rest of the app.
        <div 
            className="relative w-full h-full bg-black/40 overflow-hidden select-none isolate"
            onMouseDown={handleBgClick} 
        >
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
            />

            {renderGhosts()}

            {visibleNotes.map(note => {
                const pos = getPosition(note.column, note.key);
                const relativeTime = note.time - currentTime;
                
                const endTime = note.type === 'hold' ? note.time + (note.duration || 0) : note.time;
                const isHolding = note.type === 'hold' && currentTime >= note.time && currentTime <= endTime;
                
                let opacity = 1;
                if (relativeTime > PREEMPT - 200) {
                    opacity = (PREEMPT - relativeTime) / 200;
                } else if (relativeTime < 0 && !isHolding) {
                    opacity = 1 - (Math.abs(relativeTime) / FADE_OUT);
                }

                const progress = 1 - (relativeTime / PREEMPT);
                const approachScale = 3 - (2 * progress);

                const colors = ROW_COLORS as Record<number, string>;
                const row = KEY_TO_ROW[note.key.toLowerCase()] ?? note.column;
                const color = colors[row] || '#fff';

                // Reduce the ceiling of Z-index to avoid potential browser integer limits if any, 
                // but main fix is 'isolate'
                const zIndex = 5000 - (Math.floor(note.time) % 5000); 
                
                const isSelected = note.selected;
                const borderColor = isSelected ? '#fff' : (isHolding ? '#fff' : color);
                const borderWidth = isSelected ? '6px' : '4px';

                return (
                    <div 
                        key={note.id}
                        className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 will-change-transform cursor-pointer"
                        style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            opacity: Math.max(0, opacity),
                            zIndex: zIndex
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            if (onNoteClick) onNoteClick(e, note);
                        }}
                    >
                        {/* ACTIVE HOLD GLOW */}
                        {isHolding && (
                            <div 
                                className="absolute rounded-full animate-pulse pointer-events-none"
                                style={{
                                    width: actualSize * 1.4,
                                    height: actualSize * 1.4,
                                    backgroundColor: color,
                                    opacity: 0.3,
                                    filter: 'blur(8px)'
                                }}
                            />
                        )}

                        <div 
                            className="rounded-full flex items-center justify-center shadow-lg transition-all duration-100 hover:brightness-125"
                            style={{
                                width: actualSize,
                                height: actualSize,
                                backgroundColor: isHolding ? '#fff' : '#18181b', 
                                border: `${borderWidth} solid ${borderColor}`,
                                boxShadow: isHolding 
                                    ? `0 0 20px ${color}, inset 0 0 10px ${color}`
                                    : (isSelected ? `0 0 15px ${color}, inset 0 0 5px white` : `0 0 10px ${color}40`)
                            }}
                        >
                            <span 
                                className="font-bold font-mono drop-shadow-md" 
                                style={{ 
                                    fontSize: actualSize * 0.4,
                                    color: isHolding ? '#000' : '#fff'
                                }}
                            >
                                {note.key.toUpperCase()}
                            </span>
                        </div>

                        {showApproachCircles && relativeTime > 0 && (
                            <div 
                                className="absolute rounded-full border-2 pointer-events-none"
                                style={{
                                    width: actualSize,
                                    height: actualSize,
                                    borderColor: color,
                                    opacity: 0.6,
                                    transform: `scale(${approachScale})`
                                }}
                            />
                        )}
                        
                        {/* HOLD RING (While Active) */}
                        {isHolding && (
                            <div 
                                className="absolute rounded-full border-4 pointer-events-none"
                                style={{
                                    width: actualSize,
                                    height: actualSize,
                                    borderColor: color,
                                    opacity: 0.8
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};