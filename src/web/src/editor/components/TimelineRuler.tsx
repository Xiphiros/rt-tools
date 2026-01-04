import { TimingPoint } from '../types';
import { SNAP_COLORS } from '../utils/snapColors';

interface TimelineRulerProps {
    duration: number;
    timingPoints: TimingPoint[];
    zoom: number; // pixels per second
    snapDivisor: number;
}

export const TimelineRuler = ({ duration, timingPoints, zoom, snapDivisor }: TimelineRulerProps) => {
    const totalWidth = (duration / 1000) * zoom;

    // --- SECTION GENERATION (Matches TimelineGrid) ---
    // Sort points
    const sortedPoints = [...timingPoints].sort((a, b) => a.time - b.time);
    
    const sections = [];
    
    if (sortedPoints.length > 0) {
        // 1. Backward Extrapolation Section (0ms to First TP)
        const firstTp = sortedPoints[0];
        if (firstTp.time > 0) {
            sections.push({
                bpm: firstTp.bpm,
                offset: firstTp.time, 
                start: 0,
                end: firstTp.time,
                key: 'pre-intro'
            });
        }

        // 2. Normal Sections
        for (let i = 0; i < sortedPoints.length; i++) {
            const current = sortedPoints[i];
            const next = sortedPoints[i + 1];
            const endTime = next ? next.time : duration;
            
            sections.push({
                bpm: current.bpm,
                offset: current.time,
                start: current.time,
                end: Math.max(current.time, endTime),
                key: current.id
            });
        }
    } else {
        // Fallback default
        sections.push({ bpm: 120, offset: 0, start: 0, end: duration, key: 'default' });
    }

    // --- STYLE GENERATOR ---
    const getRulerStyle = (bpm: number, offset: number) => {
        const msPerBeat = 60000 / bpm;
        const pxPerBeat = (msPerBeat / 1000) * zoom;
        
        // 1. We want specific heights for specific snaps to create a ruler effect
        // 1/1 (Measure) = Full Height
        // 1/4 (Beat) = Medium
        // Others = Short
        const validSnaps = [1, 2, 3, 4, 6, 8, 12, 16].filter(s => s <= snapDivisor);

        const layers = validSnaps.map(s => {
            const color = SNAP_COLORS[s];
            return `linear-gradient(90deg, ${color} 1px, transparent 1px)`;
        });

        const sizes = validSnaps.map(s => {
            const interval = pxPerBeat / s;
            let height = '20%'; // Default tiny tick
            if (s === 1) height = '100%';
            else if (s === 2) height = '60%'; // 1/2
            else if (s === 4) height = '40%'; // 1/4
            
            return `${interval}px ${height}`;
        });

        const offsetPx = (offset / 1000) * zoom;
        const positions = validSnaps.map(_ => `${offsetPx}px 100%`); // Align to bottom

        return {
            backgroundImage: layers.join(', '),
            backgroundSize: sizes.join(', '),
            backgroundPosition: positions.join(', '),
            backgroundRepeat: 'repeat-x'
        };
    };

    return (
        <div 
            className="h-6 bg-card border-b border-border relative overflow-hidden select-none pointer-events-none z-10"
            style={{ width: totalWidth, minWidth: '100%' }}
        >
            {sections.map(section => {
                const left = (section.start / 1000) * zoom;
                const width = ((section.end - section.start) / 1000) * zoom;
                
                return (
                    <div 
                        key={section.key}
                        className="absolute top-0 bottom-0 overflow-hidden border-l border-white/5"
                        style={{
                            left: left,
                            width: width,
                            ...getRulerStyle(section.bpm, section.offset)
                        }}
                    />
                );
            })}
        </div>
    );
};