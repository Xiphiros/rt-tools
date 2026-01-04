import { useEffect, useState } from 'react';

interface WaveformTileProps {
    buffer: AudioBuffer;
    startPx: number;
    width: number;
    height: number;
    zoom: number; // px per second
    color: string;
    sampleRate: number; // For performance scaling
}

export const WaveformTile = ({ buffer, startPx, width, height, zoom, color }: WaveformTileProps) => {
    const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
    
    useEffect(() => {
        let active = true;

        const generate = async () => {
            const canvas = document.createElement('canvas');
            // Add slight overlap or exact pixel width
            canvas.width = Math.ceil(width);
            canvas.height = height;
            const ctx = canvas.getContext('2d', { alpha: true });
            
            if (!ctx) return;

            // Map Pixel Range to Buffer Index
            const secondsStart = startPx / zoom;
            const secondsEnd = (startPx + width) / zoom;
            
            const idxStart = Math.floor(secondsStart * buffer.sampleRate);
            const idxEnd = Math.ceil(secondsEnd * buffer.sampleRate);
            
            // Safety
            if (idxStart >= buffer.length) return;

            const data = buffer.getChannelData(0); 
            // Only slice what we need? No, access directly to save memory.
            
            const amp = height / 2;
            const samplesPerPixel = (idxEnd - idxStart) / width;
            
            // Optimization: If zoomed out heavily, we skip samples
            const step = Math.max(1, Math.floor(samplesPerPixel));

            ctx.fillStyle = color;
            ctx.beginPath();

            for (let i = 0; i < width; i++) {
                let min = 1.0;
                let max = -1.0;
                
                const pixelStartIdx = idxStart + Math.floor(i * samplesPerPixel);
                // Limit search window to avoid freezing on massive steps
                const searchLen = Math.min(step, 1000); 

                for (let j = 0; j < searchLen; j++) {
                    const raw = data[pixelStartIdx + j];
                    if (raw < min) min = raw;
                    if (raw > max) max = raw;
                }
                
                // Draw vertical line for this pixel column
                if (max >= min) {
                    ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
                }
            }

            if (!active) return;
            const bmp = await createImageBitmap(canvas);
            if (active) setBitmap(bmp);
            else bmp.close();
        };

        generate();
        return () => { active = false; };
    }, [buffer, startPx, width, height, zoom, color]); // Re-gen if zoom changes

    if (!bitmap) return null;

    return (
        <canvas 
            width={bitmap.width} 
            height={height} 
            style={{ 
                position: 'absolute',
                left: startPx,
                width: width, 
                height: '100%' 
            }} 
            ref={(node) => {
                if (node && bitmap) {
                    const ctx = node.getContext('2d');
                    if (ctx) ctx.drawImage(bitmap, 0, 0);
                }
            }}
        />
    );
};