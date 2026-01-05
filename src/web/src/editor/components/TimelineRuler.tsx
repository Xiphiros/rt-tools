import { TimingPoint } from '../types';
import { SNAP_COLORS } from '../utils/snapColors';

interface TimelineRulerProps {
    duration: number;
    timingPoints: TimingPoint[];
    zoom: number; // pixels per second
    snapDivisor: number;
}

export const TimelineRuler = ({ duration, timingPoints, zoom, snapDivisor }: TimelineRulerProps) => {
    // Similar to TimelineGrid, we rely on the filtered timingPoints passed from parent.
    const sections = [];
    
    if (timingPoints.length > 0) {
        for (let i = 0; i < timingPoints.length; i++) {
            const current = timingPoints[i];
            const next = timingPoints[i + 1];
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
        
        const validSnaps = [1, 2, 3, 4, 6, 8, 12, 16].filter(s => s <= snapDivisor);

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
            
            return `${interval}px ${height}`;
        });

        const relativeOffset = offset - sectionStart;
        const offsetPx = (relativeOffset / 1000) * zoom;
        
        // SHIFT FIX: Subtract 0.5px to center the tick
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