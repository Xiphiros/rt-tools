import { TimingPoint } from '../types';
import { SNAP_COLORS, COMMON_SNAPS } from '../utils/snapColors';

interface TimelineRulerProps {
    duration: number;
    timingPoints: TimingPoint[];
    zoom: number; // pixels per second
    snapDivisor: number;
}

export const TimelineRuler = ({ duration, timingPoints, zoom, snapDivisor }: TimelineRulerProps) => {
    const sections = [];
    const sortedPoints = [...timingPoints].sort((a, b) => a.time - b.time);
    
    if (sortedPoints.length > 0) {
        // 1. Backward Extrapolation
        const first = sortedPoints[0];
        if (first.time > 0) {
            sections.push({
                bpm: first.bpm,
                offset: first.time,
                start: 0,
                end: first.time,
                key: 'intro-extrapolated'
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
        sections.push({ bpm: 120, offset: 0, start: 0, end: duration, key: 'default' });
    }

    const getRulerStyle = (bpm: number, offset: number, sectionStart: number) => {
        const msPerBeat = 60000 / bpm;
        const pxPerBeat = (msPerBeat / 1000) * zoom;
        
        // Harmonic Filtering (See TimelineGrid.tsx)
        const validSnaps = COMMON_SNAPS.filter(s => {
            if (s === 1) return true;
            return snapDivisor % s === 0;
        });

        const layers = validSnaps.map(s => {
            const color = SNAP_COLORS[s];
            return `linear-gradient(90deg, ${color} 1px, transparent 1px)`;
        });

        const sizes = validSnaps.map(s => {
            const interval = pxPerBeat / s;
            let height = '20%'; 
            if (s === 1) height = '100%';
            else if (s === 2) height = '60%'; 
            else if (s === 4) height = '40%'; 
            else if (s === 3 || s === 6 || s === 12) height = '30%'; // Triplet height
            
            return `${interval}px ${height}`;
        });

        const relativeOffset = offset - sectionStart;
        const offsetPx = (relativeOffset / 1000) * zoom;
        
        const positions = validSnaps.map(_ => `calc(${offsetPx}px - 0.5px) 100%`); 

        return {
            backgroundImage: layers.join(', '),
            backgroundSize: sizes.join(', '),
            backgroundPosition: positions.join(', '),
            backgroundRepeat: 'repeat-x'
        };
    };

    return (
        <div 
            className="h-6 bg-card border-b border-border relative overflow-hidden select-none pointer-events-none z-10 w-full"
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
                            ...getRulerStyle(section.bpm, section.offset, section.start)
                        }}
                    />
                );
            })}
        </div>
    );
};