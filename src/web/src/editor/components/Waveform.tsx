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

    useEffect(() => {
        if (!buffer) return;

        let active = true;

        const generate = async () => {
            try {
                // Limit max canvas width to avoid browser limits (usually 32k or 65k pixels)
                // If zoom is huge, we might crash. 
                // For now, clamp to reasonable max width, or just accept the limitation.
                const width = Math.min((duration / 1000) * zoom, 32000);
                if (width <= 0) return;

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                if (!ctx) return;

                // Safely access channel data
                // If buffer is detached, this might throw
                const data = buffer.getChannelData(0); 
                const step = Math.ceil(data.length / width);
                const amp = height / 2;

                ctx.fillStyle = color;
                ctx.beginPath();

                for (let i = 0; i < width; i++) {
                    let min = 1.0;
                    let max = -1.0;
                    
                    // Optimization: Downsampling for very long files
                    for (let j = 0; j < step; j++) {
                        const datum = data[(i * step) + j];
                        if (datum < min) min = datum;
                        if (datum > max) max = datum;
                    }
                    
                    ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
                }

                if (!active) return;

                const bmp = await createImageBitmap(canvas);
                if (active) setBitmap(bmp);
                else bmp.close(); // Clean up if unmounted during generation

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

    return (
        <div 
            className="absolute top-0 left-0 pointer-events-none opacity-40 z-0"
            style={{ width: (duration / 1000) * zoom, height }}
        >
            <CanvasRenderer bitmap={bitmap} width={(duration / 1000) * zoom} height={height} />
        </div>
    );
};

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