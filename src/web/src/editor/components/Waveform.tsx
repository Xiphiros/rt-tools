import { useRef, useEffect, useState } from 'react';

interface WaveformProps {
    buffer: AudioBuffer | null;
    zoom: number; // px per second
    duration: number; // ms
    height: number;
    color?: string;
}

export const Waveform = ({ buffer, zoom, duration, height, color = '#4b5563' }: WaveformProps) => {
    const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);

    // 1. Generate Static Waveform Image (Once per buffer/zoom change)
    useEffect(() => {
        if (!buffer) return;

        const width = (duration / 1000) * zoom;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;

        // Draw logic
        const data = buffer.getChannelData(0); // Left channel
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.fillStyle = color;
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            
            ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }

        createImageBitmap(canvas).then(setBitmap);

    }, [buffer, zoom, duration, height, color]);

    // 2. Render
    if (!bitmap) return null;

    return (
        <div 
            className="absolute top-0 left-0 pointer-events-none opacity-40 z-0"
            style={{ width: (duration / 1000) * zoom, height }}
        >
            {/* Direct Canvas Render */}
            <CanvasRenderer bitmap={bitmap} width={(duration / 1000) * zoom} height={height} />
        </div>
    );
};

// Sub-component to handle the painting of the bitmap
const CanvasRenderer = ({ bitmap, width, height }: { bitmap: ImageBitmap, width: number, height: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && bitmap) {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(bitmap, 0, 0);
        }
    }, [bitmap, width, height]);

    return <canvas ref={canvasRef} width={width} height={height} />;
};