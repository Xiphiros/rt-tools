import { EditorSettings, TimingPoint } from '../types';
import { SNAP_COLORS } from '../utils/snapColors';

interface TimelineGridProps {
    duration: number; // ms
    timingPoints: TimingPoint[]; 
    settings: EditorSettings;
}

export const TimelineGrid = ({ duration, timingPoints, settings }: TimelineGridProps) => {
    const totalWidth = (duration / 1000) * settings.zoom;
    
    const sortedPoints = [...timingPoints].sort((a, b) => a.time - b.time);
    const sections = [];
    
    if (sortedPoints.length > 0) {
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

    const getGradientStyle = (bpm: number, offset: number, sectionStart: number) => {
        const msPerBeat = 60000 / bpm;
        const pxPerBeat = (msPerBeat / 1000) * settings.zoom;
        
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

        const relativeOffset = offset - sectionStart;
        const offsetPx = (relativeOffset / 1000) * settings.zoom;
        
        // SHIFT FIX: Subtract 0.5px to center the 1px line on the exact coordinate
        const backgroundPosition = validSnaps.map(_ => `calc(${offsetPx}px - 0.5px) 0`).join(', ');

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
                            ...getGradientStyle(section.bpm, section.offset, section.start)
                        }}
                    />
                );
            })}
        </div>
    );
};