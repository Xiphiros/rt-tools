import { EditorSettings, TimingPoint } from '../types';
import { SNAP_COLORS } from '../utils/snapColors';

interface TimelineGridProps {
    duration: number; // ms
    timingPoints: TimingPoint[]; // Use the full list
    settings: EditorSettings;
}

export const TimelineGrid = ({ duration, timingPoints, settings }: TimelineGridProps) => {
    // Current limitations: 
    // CSS Gradients can't easily handle variable BPMs in a single div.
    // Ideally, we render a <div> for each timing section.
    // For now, we render based on the *Active* timing point at the center of the screen 
    // OR, simpler: We render sections. Let's do sections for correctness.

    const totalWidth = (duration / 1000) * settings.zoom;
    
    // Sort points
    const sortedPoints = [...timingPoints].sort((a, b) => a.time - b.time);
    
    // Create sections covering 0 -> Duration
    const sections = [];
    
    if (sortedPoints.length > 0) {
        // 1. Backward Extrapolation Section (0ms to First TP)
        const firstTp = sortedPoints[0];
        if (firstTp.time > 0) {
            sections.push({
                bpm: firstTp.bpm,
                offset: firstTp.time, // Alignment anchor
                start: 0,
                end: firstTp.time,
                key: 'pre-intro'
            });
        }

        // 2. Normal Sections
        for (let i = 0; i < sortedPoints.length; i++) {
            const current = sortedPoints[i];
            const next = sortedPoints[i + 1];
            const endTime = next ? next.time : duration; // Lasts until next point or end of song
            
            sections.push({
                bpm: current.bpm,
                offset: current.time,
                start: current.time,
                end: Math.max(current.time, endTime), // Ensure length is positive
                key: current.id
            });
        }
    } else {
        // Fallback default
        sections.push({ bpm: 120, offset: 0, start: 0, end: duration, key: 'default' });
    }

    // Helper to generate gradient for a specific BPM/Offset
    const getGradientStyle = (bpm: number, offset: number) => {
        const msPerBeat = 60000 / bpm;
        const pxPerBeat = (msPerBeat / 1000) * settings.zoom;
        
        // Supported snaps
        const validSnaps = [1, 2, 3, 4, 6, 8, 12, 16].filter(s => s <= settings.snapDivisor);

        const backgroundImage = validSnaps.map(s => {
            const color = SNAP_COLORS[s];
            const opacity = s === 1 ? '40' : '15';
            return `linear-gradient(90deg, ${color}${opacity} 1px, transparent 1px)`;
        }).join(', ');

        const backgroundSize = validSnaps.map(s => {
            const size = pxPerBeat / s;
            return `${size}px 100%`;
        }).join(', ');

        // ALIGNMENT MAGIC:
        // We want the gradient lines to hit `offset`.
        // background-position-x determines where the pattern starts.
        // If offset is 1780ms, we convert that to pixels.
        // The pattern repeats. CSS handles the backward repeat automatically.
        const offsetPx = (offset / 1000) * settings.zoom;
        const backgroundPosition = validSnaps.map(_ => `${offsetPx}px 0`).join(', ');

        return { backgroundImage, backgroundSize, backgroundPosition };
    };

    return (
        <div className="absolute top-0 bottom-0 left-0 pointer-events-none select-none z-0" style={{ width: totalWidth }}>
            <div className="absolute inset-0 bg-card/20" />
            
            {sections.map(section => {
                const left = (section.start / 1000) * settings.zoom;
                const width = ((section.end - section.start) / 1000) * settings.zoom;
                
                return (
                    <div 
                        key={section.key}
                        className="absolute top-0 bottom-0 overflow-hidden border-l border-white/10"
                        style={{
                            left: left,
                            width: width,
                            ...getGradientStyle(section.bpm, section.offset)
                        }}
                    />
                );
            })}
        </div>
    );
};