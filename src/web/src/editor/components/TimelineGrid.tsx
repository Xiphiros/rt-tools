import { EditorSettings } from '../types';
import { SNAP_COLORS } from '../utils/snapColors';

interface TimelineGridProps {
    duration: number; // ms
    bpm: number;
    offset: number; // ms
    settings: EditorSettings;
}

export const TimelineGrid = ({ duration, bpm, offset, settings }: TimelineGridProps) => {
    const msPerBeat = 60000 / bpm;
    const pixelsPerBeat = (msPerBeat / 1000) * settings.zoom;
    const totalWidth = (duration / 1000) * settings.zoom;

    // Filter snaps that apply to current settings
    // Order: 1/1 (Top), then others.
    const supportedSnaps = [1, 2, 3, 4, 6, 8, 12, 16];
    
    // Build background string
    const validSnaps = supportedSnaps.filter(s => s <= settings.snapDivisor);

    const backgroundImage = validSnaps
        .map(s => {
            // Opacity varies: 1/1 is stronger
            const color = SNAP_COLORS[s];
            // Convert Hex to RGBA for grid opacity using simple string manipulation or CSS variable if available
            // For now, we'll assume the hex is 6 chars and append opacity
            // 1/1 = 20%, others = 10%
            const opacity = s === 1 ? '40' : '15'; 
            return `linear-gradient(90deg, ${color}${opacity} 1px, transparent 1px)`;
        })
        .join(', ');

    const backgroundSize = validSnaps
        .map(s => `${pixelsPerBeat / s}px 100%`)
        .join(', ');

    return (
        <div 
            className="absolute top-0 bottom-0 left-0 pointer-events-none select-none z-0"
            style={{ width: totalWidth, left: (offset / 1000) * settings.zoom }}
        >
            <div className="absolute inset-0 bg-card/20" />

            {/* Grid Layers */}
            <div 
                className="absolute inset-0"
                style={{
                    backgroundImage,
                    backgroundSize
                }}
            />
        </div>
    );
};