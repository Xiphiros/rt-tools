import React from 'react';
import { EditorMapData, EditorNote } from '../../editor/types';
import { KEY_TO_ROW, NOTE_SIZE, ROW_COLORS, ROW_TOP, ROW_HOME, ROW_BOTTOM } from '../constants';

interface PlayfieldProps {
    mapData: EditorMapData;
    currentTime: number; // ms
    playbackRate: number;
    showApproachCircles?: boolean;
}

// Layout Constants for Diamond Grid (CSS-like coords)
// We assume a 16:9 container, but we render centrally.
const CENTER_X = 50; // %
const CENTER_Y = 50; // %

// Row Offsets (Vertical)
// Top Row is higher, Bottom Row is lower
const ROW_Y_OFFSETS = {
    [ROW_TOP]: -15,    // % Up
    [ROW_HOME]: 0,     // Center
    [ROW_BOTTOM]: 15   // % Down
};

// Column Offsets (Horizontal)
// We need to map specific keys to specific X positions to match the diamond shape.
// Simplified Logic: 
// Top Row (QWERTY): Shifted Left
// Home Row (ASDFGH): Centered
// Bot Row (ZXCVBN): Shifted Right? 
// Actually, let's replicate the screenshot's diagonal stagger.
// Ideally, keys should be distinct. For this editor view, we'll auto-distribute notes based on time if we don't have explicit columns,
// OR since we DO have columns (0, 1, 2 = Rows), we need X separation for concurrent notes.
// 
// CURRENT EDITOR LOGIC: `note.column` is actually the ROW index (0,1,2). 
// `note.key` determines the horizontal placement in the physical keyboard sense, 
// but visually they often overlap if just using row.
// 
// Let's implement a dynamic X based on the key index within the row for visualization.

const KEY_ORDER = {
    [ROW_TOP]: ['q','w','e','r','t','y','u','i','o','p'],
    [ROW_HOME]: ['a','s','d','f','g','h','j','k','l',';'],
    [ROW_BOTTOM]: ['z','x','c','v','b','n','m',',','.','/']
};

export const Playfield = ({ mapData, currentTime, showApproachCircles = true }: PlayfieldProps) => {
    // Window of visibility: e.g., Preempt 1200ms -> FadeOut 200ms
    const PREEMPT = 1200; 
    const FADE_OUT = 200;

    // Filter visible notes
    const visibleNotes = mapData.notes.filter(n => {
        const relativeTime = n.time - currentTime;
        // Visible if: It's coming up within PREEMPT, OR it just passed within FADE_OUT
        // For holds, we also check end time
        const endTime = n.type === 'hold' ? n.time + (n.duration || 0) : n.time;
        return (relativeTime <= PREEMPT && (endTime - currentTime) >= -FADE_OUT);
    });

    const getNotePosition = (note: EditorNote) => {
        const rowKeys = KEY_ORDER[note.column] || [];
        const keyIndex = rowKeys.indexOf(note.key.toLowerCase());
        
        // Center the row
        const rowWidth = rowKeys.length;
        const xOffsetPct = ((keyIndex - (rowWidth / 2)) + 0.5) * 8; // 8% spacing per key

        // Stagger rows like a keyboard
        let rowStagger = 0;
        if (note.column === ROW_HOME) rowStagger = 2;
        if (note.column === ROW_BOTTOM) rowStagger = 4;

        return {
            x: CENTER_X + xOffsetPct + rowStagger,
            y: CENTER_Y + ROW_Y_OFFSETS[note.column]
        };
    };

    return (
        <div className="relative w-full h-full bg-black/40 overflow-hidden select-none pointer-events-none">
            {/* Grid Background (Optional reference lines) */}
            <div className="absolute inset-0 opacity-10" 
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
            />

            {/* Render Notes */}
            {visibleNotes.map(note => {
                const pos = getNotePosition(note);
                const relativeTime = note.time - currentTime;
                
                // Opacity: Fade in during approach
                let opacity = 1;
                if (relativeTime > PREEMPT - 200) {
                    opacity = (PREEMPT - relativeTime) / 200;
                } else if (relativeTime < 0 && note.type !== 'hold') {
                    // Fade out after hit
                    opacity = 1 - (Math.abs(relativeTime) / FADE_OUT);
                }

                // Approach Circle Scale
                // Starts at 3x size, shrinks to 1x at time 0
                // Clamped to 1x minimum
                const progress = 1 - (relativeTime / PREEMPT);
                const approachScale = 3 - (2 * progress);

                const color = ROW_COLORS[note.column] || '#fff';

                return (
                    <div 
                        key={note.id}
                        className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-opacity will-change-transform"
                        style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            opacity: Math.max(0, opacity),
                            zIndex: Math.floor(10000 - note.time) // New notes on top? Or old notes on top? Usually later notes are behind.
                        }}
                    >
                        {/* Note Body */}
                        <div 
                            className="rounded-full flex items-center justify-center shadow-lg"
                            style={{
                                width: NOTE_SIZE,
                                height: NOTE_SIZE,
                                backgroundColor: '#18181b', // Dark center
                                border: `4px solid ${color}`,
                                boxShadow: `0 0 10px ${color}40`
                            }}
                        >
                            <span className="text-xl font-bold text-white font-mono drop-shadow-md">
                                {note.key.toUpperCase()}
                            </span>
                        </div>

                        {/* Approach Circle */}
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