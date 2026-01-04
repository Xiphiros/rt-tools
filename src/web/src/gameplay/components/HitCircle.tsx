import React from 'react';
import { NOTE_SIZE, ROW_COLORS } from '../constants';

interface HitCircleProps {
    char: string;
    row: number;
    selected?: boolean;
    type?: 'tap' | 'hold';
    duration?: number; // ms, for holds
    
    // Editor context props
    zoom?: number; // px per second (for holding trail)
}

export const HitCircle = ({ char, row, selected, type = 'tap', duration = 0, zoom = 100 }: HitCircleProps) => {
    // Cast ROW_COLORS to allow number indexing or check existence
    const colors = ROW_COLORS as Record<number, string>;
    const baseColor = colors[row] || '#fff';
    
    // Style for the inner circle (The Hit Object)
    const circleStyle: React.CSSProperties = {
        width: NOTE_SIZE,
        height: NOTE_SIZE,
        backgroundColor: '#18181b', // zinc-900 center
        borderColor: selected ? '#fff' : baseColor,
        borderWidth: '4px',
        boxShadow: selected ? `0 0 15px ${baseColor}` : `0 0 5px ${baseColor}`,
    };

    // Hold Body Calculation
    // In a horizontal timeline, the body extends to the right
    const bodyWidth = type === 'hold' ? (duration / 1000) * zoom : 0;

    return (
        <div className="relative group select-none pointer-events-none">
            {/* 1. Hold Body (Rendered behind the head) */}
            {type === 'hold' && (
                <div 
                    className="absolute top-1/2 left-1/2 h-8 -translate-y-1/2 z-0 rounded-r-full opacity-60"
                    style={{ 
                        width: bodyWidth, 
                        backgroundColor: baseColor,
                        borderTop: `2px solid ${baseColor}`,
                        borderBottom: `2px solid ${baseColor}`,
                        background: `linear-gradient(90deg, ${baseColor} 0%, transparent 120%)`
                    }}
                />
            )}

            {/* 2. Hit Circle (The Head) */}
            <div 
                className="rounded-full flex items-center justify-center z-10 relative transition-transform duration-75 active:scale-95"
                style={circleStyle}
            >
                <span className="text-xl font-bold text-white drop-shadow-md font-mono">
                    {char.toUpperCase()}
                </span>
                
                {/* 3. Number/Overlay (Optional osu! style numbering) */}
                <div className="absolute inset-0 rounded-full border border-white/20" />
            </div>

            {/* 4. Approach Circle (Editor Visualization) */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 z-20 pointer-events-none"
                style={{
                    width: NOTE_SIZE * 2.5,
                    height: NOTE_SIZE * 2.5,
                    opacity: selected ? 0.2 : 0
                }}
            />
        </div>
    );
};