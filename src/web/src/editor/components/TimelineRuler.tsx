interface TimelineRulerProps {
    duration: number;
    bpm: number;
    zoom: number; // pixels per second
    snapDivisor: number;
}

export const TimelineRuler = ({ duration, bpm, zoom, snapDivisor }: TimelineRulerProps) => {
    const msPerBeat = 60000 / bpm;
    const pxPerBeat = (msPerBeat / 1000) * zoom;
    const totalWidth = (duration / 1000) * zoom;
    
    const majorTickSize = pxPerBeat * 4; // Measure
    const beatTickSize = pxPerBeat;      // Beat

    return (
        <div 
            className="h-8 bg-card border-b border-border relative overflow-hidden select-none pointer-events-none"
            style={{ width: totalWidth, minWidth: '100%' }}
        >
            {/* Measures (Bar Lines) */}
            <div 
                className="absolute inset-0"
                style={{
                    backgroundImage: `linear-gradient(90deg, var(--color-text-secondary) 1px, transparent 1px)`,
                    backgroundSize: `${majorTickSize}px 100%`,
                    backgroundPosition: '0 0',
                    opacity: 0.5
                }}
            />

            {/* Beats (Quarter Notes) */}
            <div 
                className="absolute inset-0"
                style={{
                    backgroundImage: `linear-gradient(90deg, var(--color-text-muted) 1px, transparent 1px)`,
                    backgroundSize: `${beatTickSize}px 50%`, // Half height
                    backgroundPosition: '0 100%', // Bottom aligned
                    backgroundRepeat: 'repeat-x',
                    opacity: 0.3
                }}
            />

            {/* Sub-beats (Snapping) */}
            {snapDivisor > 1 && (
                <div 
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `linear-gradient(90deg, var(--color-border) 1px, transparent 1px)`,
                        backgroundSize: `${beatTickSize / snapDivisor}px 25%`, // Quarter height
                        backgroundPosition: '0 100%',
                        backgroundRepeat: 'repeat-x',
                        opacity: 0.2
                    }}
                />
            )}
        </div>
    );
};