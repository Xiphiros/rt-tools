import { EditorSettings, TimingPoint } from '../types';
import { SNAP_COLORS } from '../utils/snapColors';

interface TimelineGridProps {
    duration: number; // ms
    timingPoints: TimingPoint[]; 
    settings: EditorSettings;
}

export const TimelineGrid = ({ duration, timingPoints, settings }: TimelineGridProps) => {
    // We only render sections based on the passed timingPoints.
    // The parent (EditorTimeline) is responsible for filtering these points
    // via getVisibleTimingPoints to prevent rendering 500 divs for a long map.
    
    // However, if the map has only 1 timing point at T=0, we render one massive div.
    // CSS handles massive divs relatively well, but we rely on the parent's container width.
    
    const sections = [];
    
    // Ensure we handle the "start" correctly if filtered list doesn't include 0
    // But getVisibleTimingPoints guarantees context.
    
    // Create sections from provided points
    if (timingPoints.length > 0) {
        for (let i = 0; i < timingPoints.length; i++) {
            const current = timingPoints[i];
            const next = timingPoints[i + 1];
            
            // If there's a next point, use it. If not, extend to duration.
            // Note: If we are passed a filtered list, 'next' might be the cutoff.
            // But usually the filtered list includes the "end" point if relevant.
            // Wait, getVisibleTimingPoints returns points *active* in the window.
            // So the last point in the list extends to Infinity or the next actual point.
            // We clamp visually by the container anyway.
            
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
        
        const validSnaps = [1, 2, 3, 4, 6, 8, 12, 16].filter(s => s <= settings.snapDivisor);

        const backgroundImage = validSnaps.map(s => {
            const color = SNAP_COLORS[s];
            const opacity = s === 1 ? '40' : '15';
            // Explicit stops: color from 0 to 1px, then transparent
            return `linear-gradient(90deg, ${color}${opacity} 0, ${color}${opacity} 1px, transparent 1px)`;
        }).join(', ');

        const backgroundSize = validSnaps.map(s => {
            const size = pxPerBeat / s;
            return `${size}px 100%`;
        }).join(', ');

        const relativeOffset = offset - sectionStart;
        const offsetPx = (relativeOffset / 1000) * settings.zoom;
        
        // Subtract 0.5px to center the 1px line exactly on the coordinate
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