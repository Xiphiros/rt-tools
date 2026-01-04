import React from 'react';
import { EditorMapData } from '../../editor/types';
import { NOTE_SIZE, ROW_COLORS, ROW_TOP, ROW_HOME, ROW_BOTTOM } from '../constants';

interface PlayfieldProps {
    mapData: EditorMapData;
    currentTime: number; 
    playbackRate: number;
    showApproachCircles?: boolean;
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

export const Playfield = ({ mapData, currentTime, showApproachCircles = true }: PlayfieldProps) => {
    const PREEMPT = 1200; 
    const FADE_OUT = 200;

    const visibleNotes = mapData.notes.filter(n => {
        const relativeTime = n.time - currentTime;
        const endTime = n.type === 'hold' ? n.time + (n.duration || 0) : n.time;
        return (relativeTime <= PREEMPT && (endTime - currentTime) >= -FADE_OUT);
    });

    const getPosition = (row: number, char: string) => {
        const rowKeys = KEY_ORDER[row] || [];
        const keyIndex = rowKeys.indexOf(char.toLowerCase());
        const rowWidth = rowKeys.length;
        const xOffsetPct = ((keyIndex - (rowWidth / 2)) + 0.5) * 8; 

        let rowStagger = 0;
        if (row === ROW_HOME) rowStagger = 2;
        if (row === ROW_BOTTOM) rowStagger = 4;

        return {
            x: CENTER_X + xOffsetPct + rowStagger,
            y: CENTER_Y + (ROW_Y_OFFSETS[row] || 0)
        };
    };

    // Render Static Grid (Ghost Notes)
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
                            style={{ width: NOTE_SIZE, height: NOTE_SIZE }}
                        >
                            <span className="text-xl font-bold text-white/10 font-mono">
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

            {/* Layer 1: Ghosts */}
            {renderGhosts()}

            {/* Layer 2: Active Notes */}
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
                const color = colors[note.column] || '#fff';

                return (
                    <div 
                        key={note.id}
                        className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 will-change-transform"
                        style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            opacity: Math.max(0, opacity),
                            zIndex: Math.floor(10000 - note.time)
                        }}
                    >
                        <div 
                            className="rounded-full flex items-center justify-center shadow-lg"
                            style={{
                                width: NOTE_SIZE,
                                height: NOTE_SIZE,
                                backgroundColor: '#18181b',
                                border: `4px solid ${color}`,
                                boxShadow: `0 0 10px ${color}40`
                            }}
                        >
                            <span className="text-xl font-bold text-white font-mono drop-shadow-md">
                                {note.key.toUpperCase()}
                            </span>
                        </div>

                        {showApproachCircles && relativeTime > 0 && (
                            <div 
                                className="absolute rounded-full border-2"
                                style={{
                                    width: NOTE_SIZE,
                                    height: NOTE_SIZE,
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