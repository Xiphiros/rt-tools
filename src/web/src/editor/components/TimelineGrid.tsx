import { EditorSettings } from '../types';

interface TimelineGridProps {
    duration: number; // ms
    bpm: number;
    offset: number; // ms
    settings: EditorSettings;
}

export const TimelineGrid = ({ duration, bpm, offset, settings }: TimelineGridProps) => {
    // Calculate pixels per beat
    // BPM = Beats Per Minute. 1 Beat = 60000 / BPM ms.
    // Width = (ms / 1000) * zoom
    const msPerBeat = 60000 / bpm;
    const pixelsPerBeat = (msPerBeat / 1000) * settings.zoom;
    
    const totalWidth = (duration / 1000) * settings.zoom;

    // CSS Pattern for the grid
    // We use repeating-linear-gradient to create efficient grid lines without thousands of DOM nodes
    
    // 1. Measure Lines (4 beats usually)
    const measureSize = pixelsPerBeat * 4;
    
    // 2. Snap Lines (Sub-beats based on divisor)
    // Snap Divisor logic: 1 = 1/1 beat. 2 = 1/2 beat. 4 = 1/4 beat.
    const intervalSize = pixelsPerBeat / settings.snapDivisor;

    return (
        <div 
            className="absolute top-0 bottom-0 left-0 pointer-events-none select-none z-0"
            style={{ width: totalWidth, left: (offset / 1000) * settings.zoom }}
        >
            {/* Background Base */}
            <div className="absolute inset-0 bg-card/20" />

            {/* Grid Lines generated via CSS Gradients for performance */}
            <div 
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `
                        linear-gradient(90deg, var(--color-border) 1px, transparent 1px),
                        linear-gradient(90deg, var(--color-border) 1px, transparent 1px)
                    `,
                    backgroundSize: `${measureSize}px 100%, ${intervalSize}px 100%`
                }}
            />
            
            {/* Highlight Measure Lines (Stronger opacity) */}
            <div 
                className="absolute inset-0 opacity-50"
                style={{
                    backgroundImage: `linear-gradient(90deg, var(--color-text-muted) 1px, transparent 1px)`,
                    backgroundSize: `${measureSize}px 100%`
                }}
            />
        </div>
    );
};