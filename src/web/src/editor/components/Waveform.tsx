import { useRef, useEffect, useState } from 'react';

interface WaveformProps {
    buffer: AudioBuffer | null;
    zoom: number; // px per second
    duration: number; // ms
    height: number;
    color?: string;
}

const MAX_CANVAS_WIDTH = 8000; // Conservative limit to ensure stability on all devices

export const Waveform = ({ buffer, zoom, duration, height, color = '#4b5563' }: WaveformProps) => {
    const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);

    useEffect(() => {
        if (!buffer) return;

        let active = true;

        const generate = async () => {
            try {
                // Calculate desired width
                let targetWidth = (duration / 1000) * zoom;
                
                // Clamp logical width to safe limit
                // We will stretch this to fit targetWidth via CSS later
                const logicalWidth = Math.min(targetWidth, MAX_CANVAS_WIDTH);
                
                if (logicalWidth <= 0) return;

                const canvas = document.createElement('canvas');
                canvas.width = Math.floor(logicalWidth);
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                if (!ctx) return;

                const data = buffer.getChannelData(0); 
                
                // Compression factor: How many audio samples per pixel
                // If we clamped the width, step size increases significantly (downsampling)
                const step = Math.ceil(data.length / logicalWidth);
                const amp = height / 2;

                ctx.fillStyle = color;
                ctx.beginPath();

                for (let i = 0; i < logicalWidth; i++) {
                    let min = 1.0;
                    let max = -1.0;
                    
                    // Optimization: If step is huge, don't iterate ALL samples
                    // Just take a strided sample or min/max chunk
                    // For safety vs freezing, we limit loop size per pixel
                    const chunk = Math.min(step, 1000); 
                    const offset = i * step;

                    for (let j = 0; j < chunk; j++) {
                        const idx = offset + j;
                        if (idx < data.length) {
                            const datum = data[idx];
                            if (datum < min) min = datum;
                            if (datum > max) max = datum;
                        }
                    }
                    
                    if (max >= min) {
                        ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
                    }
                }

                if (!active) return;

                const bmp = await createImageBitmap(canvas);
                if (active) setBitmap(bmp);
                else bmp.close();

            } catch (e) {
                console.warn("Waveform generation failed:", e);
            }
        };

        generate();

        return () => {
            active = false;
        };
    }, [buffer, zoom, duration, height, color]);

    if (!bitmap) return null;

    // The container determines the actual visual width (can be huge)
    const realWidth = (duration / 1000) * zoom;

    return (
        <div 
            className="absolute top-0 left-0 pointer-events-none opacity-40 z-0"
            style={{ width: realWidth, height }}
        >
            <CanvasRenderer bitmap={bitmap} height={height} />
        </div>
    );
};

const CanvasRenderer = ({ bitmap, height }: { bitmap: ImageBitmap, height: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !bitmap) return;

        try {
            // Safe draw: The canvas logical size matches the bitmap size (clamped)
            ctx.clearRect(0, 0, bitmap.width, height);
            ctx.drawImage(bitmap, 0, 0);
        } catch (e) {
            console.error("CanvasRenderer draw error:", e);
        }
    }, [bitmap, height]);

    return (
        <canvas 
            ref={canvasRef} 
            width={bitmap.width} 
            height={height} 
            style={{ width: '100%', height: '100%' }} // STRETCH to fill container
        />
    );
};