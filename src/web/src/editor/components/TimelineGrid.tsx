import { EditorSettings, TimingPoint } from '../types';
import { SNAP_COLORS, COMMON_SNAPS } from '../utils/snapColors';

interface TimelineGridProps {
    duration: number; // ms
    timingPoints: TimingPoint[]; 
    settings: EditorSettings;
}

export const TimelineGrid = ({ duration, timingPoints, settings }: TimelineGridProps) => {
    const sections = [];
    const sortedPoints = [...timingPoints].sort((a, b) => a.time - b.time);

    if (sortedPoints.length > 0) {
        // 1. Backward Extrapolation (Intro Grid)
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
        // Fallback for empty or pre-intro
        sections.push({ bpm: 120, offset: 0, start: 0, end: duration, key: 'default' });
    }

    const getGradientStyle = (bpm: number, offset: number, sectionStart: number) => {
        const msPerBeat = 60000 / bpm;
        const pxPerBeat = (msPerBeat / 1000) * settings.zoom;
        
        // HARMONIC FILTERING
        // Only show snap lines that divide the current selected snap divisor evenly.
        // e.g. if snapDivisor is 16: show 1, 2, 4, 8, 16. (16 % s === 0)
        // if snapDivisor is 12: show 1, 2, 3, 4, 6, 12.
        // if snapDivisor is 5: show 1, 5.
        // This prevents 1/3 lines appearing when 1/4 is selected (3 does not divide 4).
        const validSnaps = COMMON_SNAPS.filter(s => {
            if (s === 1) return true; // Always show beats
            return settings.snapDivisor % s === 0;
        });

        const backgroundImage = validSnaps.map(s => {
            const color = SNAP_COLORS[s];
            const opacity = s === 1 ? '40' : '15';
            return `linear-gradient(90deg, ${color}${opacity} 0, ${color}${opacity} 1px, transparent 1px)`;
        }).join(', ');

        const backgroundSize = validSnaps.map(s => {
            const size = pxPerBeat / s;
            return `${size}px 100%`;
        }).join(', ');

        const relativeOffset = offset - sectionStart;
        const offsetPx = (relativeOffset / 1000) * settings.zoom;
        
        const backgroundPosition = validSnaps.map(_ => `calc(${offsetPx}px - 0.5px) 0`).join(', ');

        return { backgroundImage, backgroundSize, backgroundPosition };
    };

    return (
        <div className="absolute top-0 bottom-0 left-0 pointer-events-none select-none z-0 w-full h-full">
            <div className="absolute inset-0 bg-card/20" />
            
            {sections.map(section => {
                const left = (section.start / 1000) * settings.zoom;
                const width = ((section.end - section.start) / 1000) * settings.zoom;
                
                return (
                    <div 
                        key={section.key}
                        className="absolute top-0 bottom-0 overflow-hidden"
                        style={{
                            left: left,
                            width: width,
                            ...getGradientStyle(section.bpm, section.offset, section.start)
                        }}
                    />
                );
            })}
        </div>
    );
};