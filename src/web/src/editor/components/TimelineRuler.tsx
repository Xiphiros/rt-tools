import { SNAP_COLORS } from '../utils/snapColors';

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

    // We generate CSS gradients for each supported snap level up to the current divisor
    // Order matters: Finer snaps drawn first (bottom), Coarser snaps last (top/visible)
    // 1/1 should be on top of 1/2, etc.
    
    const layers: string[] = [];
    const supportedSnaps = [1, 2, 3, 4, 6, 8, 12, 16];

    // Reverse order: render large divisors first (background), small divisors last (foreground)? 
    // No, CSS background layers: first one defined is ON TOP.
    // So we want 1/1 first, then 1/2, etc.
    
    supportedSnaps.forEach(snap => {
        if (snap > snapDivisor) return; // Don't render 1/8 if we are on 1/4 snap

        const color = SNAP_COLORS[snap];
        const tickWidth = '1px'; // standard width
        
        // CSS Repeat Size = pxPerBeat / (snap / 4)? No.
        // 1/1 = 1 beat interval
        // 1/2 = 0.5 beat interval

        layers.push(
            `linear-gradient(90deg, ${color} ${tickWidth}, transparent ${tickWidth})`
        );
    });

    const backgroundSizes = supportedSnaps
        .filter(s => s <= snapDivisor)
        .map(s => {
            const pxInterval = pxPerBeat / s;
            const h = s === 1 ? '100%' : s === 2 ? '60%' : '35%';
            return `${pxInterval}px ${h}`;
        })
        .join(', ');

    const backgroundImage = supportedSnaps
        .filter(s => s <= snapDivisor)
        .map(s => {
            const color = SNAP_COLORS[s];
            return `linear-gradient(90deg, ${color} 1px, transparent 1px)`;
        })
        .join(', ');

    return (
        <div 
            className="h-6 bg-card border-b border-border relative overflow-hidden select-none pointer-events-none"
            style={{ width: totalWidth, minWidth: '100%' }}
        >
            <div 
                className="absolute inset-0"
                style={{
                    backgroundImage,
                    backgroundSize: backgroundSizes,
                    backgroundPosition: '0 100%', // Bottom aligned
                    backgroundRepeat: 'repeat-x',
                    opacity: 0.8
                }}
            />
        </div>
    );
};