import { useRef, useEffect, useState } from 'react';

export type WaveformMode = 'full' | 'bass' | 'treble';

interface WaveformProps {
    buffer: AudioBuffer | null;
    zoom: number; // px per second
    duration: number; // ms
    height: number;
    color?: string;
    mode?: WaveformMode; // New Prop
}

const MAX_CANVAS_WIDTH = 8000;

export const Waveform = ({ buffer, zoom, duration, height, color = '#4b5563', mode = 'full' }: WaveformProps) => {
    const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
    const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 1. Filter Audio Buffer based on Mode
    useEffect(() => {
        if (!buffer) return;
        if (mode === 'full') {
            setProcessedBuffer(buffer);
            return;
        }

        let active = true;
        setIsProcessing(true);

        const process = async () => {
            try {
                // Offline context renders faster than real-time
                const offlineCtx = new OfflineAudioContext(
                    buffer.numberOfChannels,
                    buffer.length,
                    buffer.sampleRate
                );

                const source = offlineCtx.createBufferSource();
                source.buffer = buffer;

                const filter = offlineCtx.createBiquadFilter();
                
                if (mode === 'bass') {
                    filter.type = 'lowpass';
                    filter.frequency.value = 140; // Focus on Kick/Bass
                    filter.Q.value = 1;
                } else if (mode === 'treble') {
                    filter.type = 'highpass';
                    filter.frequency.value = 2000; // Focus on Vocals/Hi-hats
                    filter.Q.value = 1;
                }

                source.connect(filter);
                filter.connect(offlineCtx.destination);
                source.start();

                const renderedBuffer = await offlineCtx.startRendering();
                
                if (active) {
                    setProcessedBuffer(renderedBuffer);
                    setIsProcessing(false);
                }
            } catch (e) {
                console.error("Audio filtering failed:", e);
                if (active) setIsProcessing(false);
            }
        };

        process();

        return () => { active = false; };
    }, [buffer, mode]);

    // 2. Generate Visual Bitmap from (Processed) Buffer
    useEffect(() => {
        if (!processedBuffer) return;

        let active = true;

        const generate = async () => {
            try {
                let targetWidth = (duration / 1000) * zoom;
                const logicalWidth = Math.min(targetWidth, MAX_CANVAS_WIDTH);
                
                if (logicalWidth <= 0) return;

                const canvas = document.createElement('canvas');
                canvas.width = Math.floor(logicalWidth);
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                if (!ctx) return;

                const data = processedBuffer.getChannelData(0); 
                const step = Math.ceil(data.length / logicalWidth);
                const amp = height / 2;

                ctx.fillStyle = color;
                ctx.beginPath();

                for (let i = 0; i < logicalWidth; i++) {
                    let min = 1.0;
                    let max = -1.0;
                    
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

        return () => { active = false; };
    }, [processedBuffer, zoom, duration, height, color]);

    if (!bitmap) return null;

    const realWidth = (duration / 1000) * zoom;

    return (
        <div 
            className={`absolute top-0 left-0 pointer-events-none z-0 transition-opacity duration-200 ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
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
            ctx.clearRect(0, 0, bitmap.width, height);
            ctx.drawImage(bitmap, 0, 0);
        } catch (e) {
            // Ignore error state
        }
    }, [bitmap, height]);

    return (
        <canvas 
            ref={canvasRef} 
            width={bitmap.width} 
            height={height} 
            style={{ width: '100%', height: '100%' }}
        />
    );
};