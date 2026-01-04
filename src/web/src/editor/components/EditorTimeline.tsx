import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useEditor } from '../store/EditorContext';
import { TimelineGrid } from './TimelineGrid';
import { TimelineRuler } from './TimelineRuler';
import { ChordPreview } from './ChordPreview';
import { EditorNote } from '../types';
import { getSnapColor, getSnapDivisor } from '../utils/snapColors';

export const EditorTimeline = () => {
    const { mapData, settings, setSettings, playback, dispatch, audio, activeTool } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [hoverTime, setHoverTime] = useState(0);
    const [hoveredChord, setHoveredChord] = useState<{ time: number, notes: EditorNote[], x: number, y: number } | null>(null);
    
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, time: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number, time: number } | null>(null);

    // --- AGGREGATION ---
    const tickGroups = useMemo(() => {
        const groups = new Map<number, EditorNote[]>();
        const msPerBeat = 60000 / mapData.bpm;

        mapData.notes.forEach(note => {
            const key = Math.round(note.time);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(note);
        });

        return Array.from(groups.entries()).map(([time, notes]) => {
            const beatIndex = (time - mapData.offset) / msPerBeat;
            const snap = getSnapDivisor(beatIndex);
            const color = getSnapColor(snap || 4);
            return { time, notes, color };
        });
    }, [mapData.notes, mapData.bpm, mapData.offset]);

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
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
        const rawTime = (clickX / settings.zoom) * 1000;

        if (activeTool === 'select' && e.button === 0) {
            setIsDragging(true);
            setDragStart({ x: clickX, time: rawTime });
            setDragCurrent({ x: clickX, time: rawTime });
        }
        
        if (!e.shiftKey && !e.ctrlKey) {
            const msPerBeat = 60000 / mapData.bpm;
            const snapInterval = msPerBeat / settings.snapDivisor;
            const seekTime = settings.snappingEnabled 
                ? Math.round(rawTime / snapInterval) * snapInterval
                : rawTime;
            audio.seek(seekTime);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft;
        const rawTime = (x / settings.zoom) * 1000;

        const msPerBeat = 60000 / mapData.bpm;
        const snapInterval = msPerBeat / settings.snapDivisor;
        const snapped = Math.round(rawTime / snapInterval) * snapInterval;
        setHoverTime(snapped);

        if (isDragging && dragStart) {
            setDragCurrent({ x, time: rawTime });
        }
    };

    const handleMouseUp = () => {
        if (isDragging && dragStart && dragCurrent) {
            const t1 = Math.min(dragStart.time, dragCurrent.time);
            const t2 = Math.max(dragStart.time, dragCurrent.time);
            
            if (t2 - t1 < 5) {
                dispatch({ type: 'DESELECT_ALL' });
            } else {
                const selectedIds = mapData.notes
                    .filter(n => n.time >= t1 && n.time <= t2)
                    .map(n => n.id);
                dispatch({ type: 'SELECT_NOTES', payload: { ids: selectedIds, append: false } });
            }
        }
        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
    };

    useEffect(() => {
        if (playback.isPlaying && containerRef.current) {
            const scrollPos = (playback.currentTime / 1000) * settings.zoom - (containerRef.current.clientWidth / 2);
            containerRef.current.scrollLeft = scrollPos;
        }
    }, [playback.currentTime, playback.isPlaying, settings.zoom]);

    const handleTickEnter = (e: React.MouseEvent, time: number, notes: EditorNote[]) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setHoveredChord({
            time,
            notes,
            // Calculate center of the tick
            x: rect.left + (rect.width / 2),
            // Position above the timeline container
            y: rect.top - 10
        });
    };

    // Render Tooltip via Portal to break out of overflow:hidden
    const tooltip = hoveredChord ? (
        <div 
            className="fixed z-[9999] pointer-events-none transition-all duration-150"
            style={{ 
                left: hoveredChord.x, 
                top: hoveredChord.y,
                transform: 'translate(-50%, -100%)' // Center horizontal, Place above
            }}
        >
            <div className="animate-in fade-in zoom-in-95 duration-100 mb-2">
                <ChordPreview notes={hoveredChord.notes} scale={0.5} />
                {/* Pointer */}
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black/90" />
            </div>
        </div>
    ) : null;

    return (
        <div className="flex-1 flex flex-col bg-background relative select-none h-full">
            {/* Render Portal */}
            {createPortal(tooltip, document.body)}

            <div 
                ref={containerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar h-full group"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { handleMouseUp(); setHoveredChord(null); }}
            >
                <div className="relative" style={{ width: (playback.duration / 1000) * settings.zoom, minWidth: '100%', height: '100%' }}>
                    {/* Layer 1: Ruler */}
                    <div className="sticky top-0 z-30">
                        <TimelineRuler duration={playback.duration} bpm={mapData.bpm} zoom={settings.zoom} snapDivisor={settings.snapDivisor} />
                    </div>

                    {/* Layer 2: Grid */}
                    <div className="absolute top-8 bottom-0 left-0 right-0 z-0">
                        <TimelineGrid duration={playback.duration} bpm={mapData.bpm} offset={mapData.offset} settings={settings} />
                    </div>

                    {/* Layer 3: Selection Box */}
                    {isDragging && dragStart && dragCurrent && (
                        <div 
                            className="absolute top-8 bottom-0 bg-blue-500/20 border border-blue-400 z-20 pointer-events-none"
                            style={{
                                left: Math.min(dragStart.x, dragCurrent.x),
                                width: Math.abs(dragCurrent.x - dragStart.x)
                            }}
                        />
                    )}

                    {/* Layer 4: Note Ticks */}
                    <div className="absolute top-8 left-0 right-0 bottom-0 pointer-events-none z-40">
                        {tickGroups.map(group => {
                            const isSelected = group.notes.some(n => n.selected);
                            const hasHold = group.notes.some(n => n.type === 'hold');
                            const tickColor = isSelected ? '#fff' : group.color;
                            const tickWidth = Math.max(4, settings.zoom / 30);

                            return (
                                <React.Fragment key={group.time}>
                                    <div
                                        className={`absolute top-1/2 -translate-y-1/2 cursor-pointer pointer-events-auto transition-transform hover:scale-y-110 hover:brightness-125
                                            ${isSelected ? 'shadow-[0_0_8px_white] z-50' : 'z-40'}
                                        `}
                                        style={{
                                            left: (group.time / 1000) * settings.zoom - (tickWidth / 2),
                                            width: tickWidth,
                                            height: '40%',
                                            backgroundColor: tickColor,
                                            borderRadius: '4px',
                                            boxShadow: `0 0 4px ${tickColor}80`
                                        }}
                                        onMouseEnter={(e) => handleTickEnter(e, group.time, group.notes)}
                                        onMouseLeave={() => setHoveredChord(null)}
                                    />
                                    
                                    {hasHold && group.notes.map((n) => n.type === 'hold' && (
                                        <div 
                                            key={`${n.id}_tail`}
                                            className="absolute top-1/2 -translate-y-1/2 h-1 opacity-40 pointer-events-none"
                                            style={{
                                                left: (group.time / 1000) * settings.zoom,
                                                width: (n.duration! / 1000) * settings.zoom,
                                                backgroundColor: tickColor,
                                                zIndex: 35
                                            }}
                                        />
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Layer 5: Cursors */}
                    {!playback.isPlaying && (
                        <div className="absolute top-8 bottom-0 w-[1px] bg-white/30 pointer-events-none z-30" style={{ left: (hoverTime / 1000) * settings.zoom }} />
                    )}
                    <div className="absolute top-0 bottom-0 w-[2px] bg-yellow-400 z-50 pointer-events-none shadow-[0_0_10px_rgba(250,204,21,0.8)]" style={{ left: (playback.currentTime / 1000) * settings.zoom }}>
                        <div className="absolute top-0 -left-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-yellow-400" />
                    </div>
                </div>
            </div>
        </div>
    );
};