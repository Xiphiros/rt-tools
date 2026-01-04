import { useEffect, useState, useMemo } from 'react';
import { WaveformTile } from './WaveformTile';

export type WaveformMode = 'full' | 'bass' | 'treble';

interface WaveformProps {
    buffer: AudioBuffer | null;
    zoom: number; // px per second
    duration: number; // ms
    height: number;
    color?: string;
    mode?: WaveformMode;
}

const TILE_WIDTH = 4000; // 4000px per canvas is safe on all GPUs

export const Waveform = ({ buffer, zoom, duration, height, color = '#4b5563', mode = 'full' }: WaveformProps) => {
    const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 1. Process Buffer (Filter Logic)
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
                    filter.frequency.value = 140;
                    filter.Q.value = 1;
                } else if (mode === 'treble') {
                    filter.type = 'highpass';
                    filter.frequency.value = 2000;
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

    // 2. Calculate Tiles
    const tiles = useMemo(() => {
        if (!processedBuffer) return [];
        
        const totalWidth = (duration / 1000) * zoom;
        const count = Math.ceil(totalWidth / TILE_WIDTH);
        
        return Array.from({ length: count }).map((_, i) => ({
            id: i,
            startPx: i * TILE_WIDTH,
            width: Math.min(TILE_WIDTH, totalWidth - (i * TILE_WIDTH))
        }));
    }, [processedBuffer, zoom, duration]);

    if (!processedBuffer) return null;

    const realWidth = (duration / 1000) * zoom;

    return (
        <div 
            className={`absolute top-0 left-0 pointer-events-none z-0 transition-opacity duration-200 ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
            style={{ width: realWidth, height }}
        >
            {tiles.map(tile => (
                <WaveformTile 
                    key={`${tile.id}-${zoom}-${mode}`} // Re-mount if zoom/mode changes
                    buffer={processedBuffer}
                    startPx={tile.startPx}
                    width={tile.width}
                    height={height}
                    zoom={zoom}
                    color={color}
                    sampleRate={processedBuffer.sampleRate}
                />
            ))}
        </div>
    );
};