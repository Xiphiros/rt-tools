import { useState, useEffect, RefObject, useCallback } from 'react';
import debounce from 'lodash.debounce';

interface VirtualWindow {
    startTime: number;
    endTime: number;
    startPx: number;
    endPx: number;
    renderStartPx: number; // Including buffer
}

interface UseVirtualWindowProps {
    containerRef: RefObject<HTMLElement>;
    zoom: number; // pixels per second
    totalDuration: number; // ms
    bufferPx?: number; // Extra pixels to render off-screen
}

/**
 * Calculates the visible time range based on the container's scroll position.
 * Returns both precise time ranges (for data slicing) and pixel ranges (for positioning).
 */
export const useVirtualWindow = ({
    containerRef,
    zoom,
    totalDuration,
    bufferPx = 1000 // Render 1000px ahead/behind (~2 screens usually)
}: UseVirtualWindowProps): VirtualWindow => {
    const [windowState, setWindowState] = useState<VirtualWindow>({
        startTime: 0,
        endTime: 0,
        startPx: 0,
        endPx: 0,
        renderStartPx: 0
    });

    const calculateWindow = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        const { scrollLeft, clientWidth } = container;

        // Determine visible pixel range
        const startPx = scrollLeft;
        const endPx = scrollLeft + clientWidth;

        // Apply buffer
        const renderStartPx = Math.max(0, startPx - bufferPx);
        const renderEndPx = endPx + bufferPx;

        // Convert to time (ms)
        const startTime = (renderStartPx / zoom) * 1000;
        const endTime = (renderEndPx / zoom) * 1000;

        setWindowState({
            startTime,
            endTime: Math.min(endTime, totalDuration),
            startPx,
            endPx,
            renderStartPx
        });
    }, [containerRef, zoom, totalDuration, bufferPx]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Initial calculation
        calculateWindow();

        // Optimized scroll handler
        // We use requestAnimationFrame to throttle without losing the "latest" frame
        let rAF: number | null = null;

        const onScroll = () => {
            if (rAF) return;
            rAF = requestAnimationFrame(() => {
                calculateWindow();
                rAF = null;
            });
        };

        // Resize observer to handle window resizing
        const resizeObserver = new ResizeObserver(() => {
            calculateWindow();
        });
        resizeObserver.observe(container);

        container.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', onScroll);
            resizeObserver.disconnect();
            if (rAF) cancelAnimationFrame(rAF);
        };
    }, [calculateWindow, containerRef]);

    return windowState;
};