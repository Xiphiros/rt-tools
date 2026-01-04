import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useEditor } from '../store/EditorContext';
import { TimelineGrid } from './TimelineGrid';
import { TimelineRuler } from './TimelineRuler';
import { ChordPreview } from './ChordPreview';
import { EditorNote } from '../types';

export const EditorTimeline = () => {
    const { mapData, settings, setSettings, playback, dispatch, audio, activeTool } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [hoverTime, setHoverTime] = useState(0);
    const [hoveredChord, setHoveredChord] = useState<{ time: number, notes: EditorNote[], x: number, y: number } | null>(null);
    
    // Drag Selection State
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, time: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number, time: number } | null>(null);

    // --- AGGREGATION LOGIC ---
    // Group notes by time for visualization
    const tickGroups = useMemo(() => {
        const groups = new Map<number, EditorNote[]>();
        mapData.notes.forEach(note => {
            if (!groups.has(note.time)) groups.set(note.time, []);
            groups.get(note.time)!.push(note);
        });
        return Array.from(groups.entries()).map(([time, notes]) => ({ time, notes }));
    }, [mapData.notes]);

    // --- ZOOM ---
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -25 : 25;
                setSettings(s => ({ ...s, zoom: Math.max(50, Math.min(500, s.zoom + delta)) }));
            }
        };
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [setSettings]);

    // --- MOUSE HANDLERS ---
    
    // 1. Mouse Down: Start Drag OR Seek
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
        const rawTime = (clickX / settings.zoom) * 1000;

        // If Tool is Select, start dragging box
        if (activeTool === 'select' && e.button === 0) {
            setIsDragging(true);
            setDragStart({ x: clickX, time: rawTime });
            setDragCurrent({ x: clickX, time: rawTime });
        }
        
        // Always seek on click (unless purely dragging? No, usually seek on down)
        // If holding shift/ctrl, maybe skip seek.
        if (!e.shiftKey && !e.ctrlKey) {
            // Apply snapping if enabled for precise seek
            const msPerBeat = 60000 / mapData.bpm;
            const snapInterval = msPerBeat / settings.snapDivisor;
            const seekTime = settings.snappingEnabled 
                ? Math.round(rawTime / snapInterval) * snapInterval
                : rawTime;
            
            audio.seek(seekTime);
        }
    };

    // 2. Mouse Move: Update Drag / Hover
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft;
        const rawTime = (x / settings.zoom) * 1000;

        // Update Hover Snapping
        const msPerBeat = 60000 / mapData.bpm;
        const snapInterval = msPerBeat / settings.snapDivisor;
        const snapped = Math.round(rawTime / snapInterval) * snapInterval;
        setHoverTime(snapped);

        if (isDragging && dragStart) {
            setDragCurrent({ x, time: rawTime });
        }
    };

    // 3. Mouse Up: Finalize Selection
    const handleMouseUp = () => {
        if (isDragging && dragStart && dragCurrent) {
            // Calculate Box Range
            const t1 = Math.min(dragStart.time, dragCurrent.time);
            const t2 = Math.max(dragStart.time, dragCurrent.time);
            
            // If box is tiny, treat as single click (clear selection)
            if (t2 - t1 < 5) {
                dispatch({ type: 'DESELECT_ALL' });
            } else {
                // Find notes in range
                const selectedIds = mapData.notes
                    .filter(n => n.time >= t1 && n.time <= t2)
                    .map(n => n.id);
                
                dispatch({ 
                    type: 'SELECT_NOTES', 
                    payload: { ids: selectedIds, append: false } // Ctrl support logic handled elsewhere if needed
                });
            }
        }
        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
    };

    // Auto-scroll
    useEffect(() => {
        if (playback.isPlaying && containerRef.current) {
            const scrollPos = (playback.currentTime / 1000) * settings.zoom - (containerRef.current.clientWidth / 2);
            containerRef.current.scrollLeft = scrollPos;
        }
    }, [playback.currentTime, playback.isPlaying, settings.zoom]);

    // Tick Interaction
    const handleTickEnter = (e: React.MouseEvent, time: number, notes: EditorNote[]) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setHoveredChord({
            time,
            notes,
            x: rect.left,
            y: rect.top - 140
        });
    };

    return (
        <div className="flex-1 flex flex-col bg-background relative select-none h-full">
            {hoveredChord && (
                <div className="fixed z-[999] pointer-events-none transition-opacity duration-200"
                     style={{ left: hoveredChord.x, top: hoveredChord.y }}>
                    <ChordPreview notes={hoveredChord.notes} />
                </div>
            )}

            <div 
                ref={containerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar h-full"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { handleMouseUp(); setHoveredChord(null); }}
            >
                <div className="relative" style={{ width: (playback.duration / 1000) * settings.zoom, minWidth: '100%', height: '100%' }}>
                    {/* Components */}
                    <div className="sticky top-0 z-20">
                        <TimelineRuler duration={playback.duration} bpm={mapData.bpm} zoom={settings.zoom} snapDivisor={settings.snapDivisor} />
                    </div>
                    <div className="absolute top-8 bottom-0 left-0 right-0">
                        <TimelineGrid duration={playback.duration} bpm={mapData.bpm} offset={mapData.offset} settings={settings} />
                    </div>

                    {/* Generic Note Ticks (Aggregated) */}
                    <div className="absolute top-8 left-0 right-0 bottom-0 pointer-events-none">
                        {tickGroups.map(group => {
                            const isSelected = group.notes.some(n => n.selected);
                            return (
                                <div
                                    key={group.time}
                                    className={`absolute top-2 h-16 w-1 cursor-pointer pointer-events-auto transition-colors hover:bg-white
                                        ${isSelected ? 'bg-primary shadow-[0_0_10px_var(--color-primary)]' : 'bg-primary/50'}
                                    `}
                                    style={{
                                        left: (group.time / 1000) * settings.zoom,
                                        width: Math.max(2, settings.zoom / 50) // Scale width slightly
                                    }}
                                    onMouseEnter={(e) => handleTickEnter(e, group.time, group.notes)}
                                    onMouseLeave={() => setHoveredChord(null)}
                                />
                            );
                        })}
                    </div>

                    {/* Selection Box */}
                    {isDragging && dragStart && dragCurrent && (
                        <div 
                            className="absolute top-8 bottom-0 bg-primary/20 border border-primary/50 z-30 pointer-events-none"
                            style={{
                                left: Math.min(dragStart.x, dragCurrent.x),
                                width: Math.abs(dragCurrent.x - dragStart.x)
                            }}
                        />
                    )}

                    {/* Cursors */}
                    {!playback.isPlaying && (
                        <div className="absolute top-8 bottom-0 w-0.5 bg-white/20 pointer-events-none z-30" style={{ left: (hoverTime / 1000) * settings.zoom }} />
                    )}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-warning z-40 pointer-events-none shadow-[0_0_15px_rgba(251,191,36,0.8)]" style={{ left: (playback.currentTime / 1000) * settings.zoom }}>
                        <div className="absolute top-0 -left-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-warning" />
                    </div>
                </div>
            </div>
        </div>
    );
};