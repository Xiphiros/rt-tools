import { useState, useEffect, RefObject, useCallback } from 'react';

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
    contentOffset?: number; // Padding at the start (px)
}

/**
 * Calculates the visible time range based on the container's scroll position.
 * Returns both precise time ranges (for data slicing) and pixel ranges (for positioning).
 */
export const useVirtualWindow = ({
    containerRef,
    zoom,
    totalDuration,
    bufferPx = 1000, // Render 1000px ahead/behind (~2 screens usually)
    contentOffset = 0
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

        // Determine visible pixel range relative to CONTENT start (t=0)
        // If scrollLeft is 0, and offset is 300, we are viewing -300px to width-300px.
        // We only care about positive time for rendering, so we clamp.
        
        const visibleStartPx = scrollLeft - contentOffset;
        const visibleEndPx = scrollLeft + clientWidth - contentOffset;

        // Apply buffer
        const renderStartPx = Math.max(0, visibleStartPx - bufferPx);
        const renderEndPx = visibleEndPx + bufferPx;

        // Convert to time (ms)
        const startTime = (renderStartPx / zoom) * 1000;
        const endTime = (renderEndPx / zoom) * 1000;

        setWindowState({
            startTime: Math.max(0, startTime),
            endTime: Math.min(Math.max(0, endTime), totalDuration),
            startPx: scrollLeft,
            endPx: scrollLeft + clientWidth,
            renderStartPx: Math.max(0, renderStartPx) // Absolute pixel position for some virtualizers
        });
    }, [containerRef, zoom, totalDuration, bufferPx, contentOffset]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Initial calculation
        calculateWindow();

        // Optimized scroll handler
        let rAF: number | null = null;

        const onScroll = () => {
            if (rAF) return;
            rAF = requestAnimationFrame(() => {
                calculateWindow();
                rAF = null;
            });
        };

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