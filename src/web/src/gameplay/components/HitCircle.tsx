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
    
    // New Visual Props
    shape?: 'circle' | 'diamond';
    approachStyle?: 'standard' | 'inverted';
    progress?: number; // 0 to 1 (0 = start of approach, 1 = hit time)
}

export const HitCircle = ({ 
    char, 
    row, 
    selected, 
    type = 'tap', 
    duration = 0, 
    zoom = 100,
    shape = 'circle',
    approachStyle = 'standard',
    progress = 1 // Defaults to fully visible if not passed
}: HitCircleProps) => {
    const colors = ROW_COLORS as Record<number, string>;
    const baseColor = colors[row] || '#fff';
    
    // Shape styling
    const borderRadius = shape === 'circle' ? '50%' : '0%';
    const rotation = shape === 'diamond' ? 'rotate(45deg)' : 'rotate(0deg)';
    
    // Style for the inner note (Head)
    const noteStyle: React.CSSProperties = {
        width: NOTE_SIZE,
        height: NOTE_SIZE,
        backgroundColor: '#18181b', // zinc-900 center
        borderColor: selected ? '#fff' : baseColor,
        borderWidth: '4px',
        boxShadow: selected ? `0 0 15px ${baseColor}` : `0 0 5px ${baseColor}`,
        borderRadius: borderRadius,
        transform: rotation,
    };

    // Hold Body Calculation
    const bodyWidth = type === 'hold' ? (duration / 1000) * zoom : 0;

    // Approach Circle Logic
    // Standard: Scales from 2.5 -> 1.0
    // Inverted: Scales from 0.0 -> 1.0 (Inside Out)
    let approachScale = 1;
    let approachOpacity = 0;

    if (progress < 1) {
        approachOpacity = 0.6; // Base visibility during approach
        if (approachStyle === 'standard') {
            // 2.5 down to 1
            approachScale = 2.5 - (1.5 * progress); 
        } else {
            // 0 up to 1
            // We use a slight oversize (1.1) to ensure it locks in visually around the border
            approachScale = progress * 1.3; 
        }
    }

    return (
        <div className="relative group select-none pointer-events-none">
            {/* 1. Hold Body (Rendered behind the head) */}
            {type === 'hold' && (
                <div 
                    className="absolute top-1/2 left-1/2 h-8 -translate-y-1/2 z-0 rounded-r-full opacity-60 origin-left"
                    style={{ 
                        width: bodyWidth, 
                        backgroundColor: baseColor,
                        borderTop: `2px solid ${baseColor}`,
                        borderBottom: `2px solid ${baseColor}`,
                        background: `linear-gradient(90deg, ${baseColor} 0%, transparent 120%)`
                    }}
                />
            )}

            {/* 2. Note Head */}
            <div 
                className="flex items-center justify-center z-10 relative transition-transform duration-75 active:scale-95"
                style={noteStyle}
            >
                {/* Text needs to counter-rotate if diamond so it stays upright */}
                <span 
                    className="text-xl font-bold text-white drop-shadow-md font-mono"
                    style={{ transform: shape === 'diamond' ? 'rotate(-45deg)' : 'none' }}
                >
                    {char.toUpperCase()}
                </span>
                
                {/* 3. Number/Overlay (Optional osu! style numbering) */}
                <div 
                    className="absolute inset-0 border border-white/20" 
                    style={{ borderRadius: borderRadius }}
                />
            </div>

            {/* 4. Approach Circle */}
            {(progress < 1 && progress > 0) && (
                <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 z-20 pointer-events-none"
                    style={{
                        width: NOTE_SIZE,
                        height: NOTE_SIZE,
                        borderColor: selected ? '#fff' : baseColor,
                        opacity: approachOpacity,
                        borderRadius: borderRadius,
                        transform: `${rotation} scale(${approachScale})`,
                        // If inverted, we want it to clip inside? No, overlay is better.
                    }}
                />
            )}
        </div>
    );
};