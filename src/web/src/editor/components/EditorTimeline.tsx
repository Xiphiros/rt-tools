import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useEditor } from '../store/EditorContext';
import { TimelineGrid } from './TimelineGrid';
import { TimelineRuler } from './TimelineRuler';
import { MiniPlayfield } from './MiniPlayfield';
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
            const color = snap > 0 ? getSnapColor(snap) : '#FFFFFF'; 
            return { time, notes, color, isUnsnapped: snap === 0 };
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
            x: rect.left + (rect.width / 2),
            y: rect.top - 10
        });
    };

    const tooltip = hoveredChord ? (
        <div 
            className="fixed z-[9999] pointer-events-none transition-all duration-150"
            style={{ 
                left: hoveredChord.x, 
                top: hoveredChord.y,
                transform: 'translate(-50%, -100%)' 
            }}
        >
            <div className="animate-in fade-in zoom-in-95 duration-100 mb-2">
                <MiniPlayfield notes={hoveredChord.notes} scale={0.25} />
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black/95" />
            </div>
        </div>
    ) : null;

    return (
        <div className="flex-1 flex flex-col bg-background relative select-none h-full">
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
                    <div className="sticky top-0 z-30">
                        <TimelineRuler duration={playback.duration} bpm={mapData.bpm} zoom={settings.zoom} snapDivisor={settings.snapDivisor} />
                    </div>

                    <div className="absolute top-8 bottom-0 left-0 right-0 z-0">
                        <TimelineGrid duration={playback.duration} bpm={mapData.bpm} offset={mapData.offset} settings={settings} />
                    </div>

                    {isDragging && dragStart && dragCurrent && (
                        <div 
                            className="absolute top-8 bottom-0 bg-blue-500/20 border border-blue-400 z-20 pointer-events-none"
                            style={{
                                left: Math.min(dragStart.x, dragCurrent.x),
                                width: Math.abs(dragCurrent.x - dragStart.x)
                            }}
                        />
                    )}

                    <div className="absolute top-8 left-0 right-0 bottom-0 pointer-events-none z-40">
                        {tickGroups.map(group => {
                            const isSelected = group.notes.some(n => n.selected);
                            const hasHold = group.notes.some(n => n.type === 'hold');
                            const tickColor = isSelected ? '#fff' : group.color;
                            
                            // Align Logic:
                            // We want width to be EVEN to allow perfect centering with integer transforms.
                            let rawWidth = group.isUnsnapped ? 2 : Math.max(4, settings.zoom / 30);
                            if (rawWidth % 2 !== 0) rawWidth += 1;

                            const bgStyle = group.isUnsnapped 
                                ? { backgroundColor: '#fff', opacity: 0.8 } 
                                : { backgroundColor: tickColor };

                            return (
                                <React.Fragment key={group.time}>
                                    <div
                                        className={`absolute top-1/2 cursor-pointer pointer-events-auto transition-transform hover:scale-y-110 hover:brightness-125
                                            ${isSelected ? 'shadow-[0_0_8px_white] z-50' : 'z-40'}
                                        `}
                                        style={{
                                            left: (group.time / 1000) * settings.zoom,
                                            width: rawWidth,
                                            height: '50%',
                                            borderRadius: '4px',
                                            transform: 'translate(-50%, -50%)', // Centered relative to 'left'
                                            boxShadow: group.isUnsnapped ? 'none' : `0 0 4px ${tickColor}80`,
                                            ...bgStyle
                                        }}
                                        onMouseEnter={(e) => handleTickEnter(e, group.time, group.notes)}
                                        onMouseLeave={() => setHoveredChord(null)}
                                    />
                                    
                                    {hasHold && group.notes.map((n) => n.type === 'hold' && (
                                        <div 
                                            key={`${n.id}_tail`}
                                            className="absolute top-1/2 h-1 opacity-40 pointer-events-none"
                                            style={{
                                                left: (group.time / 1000) * settings.zoom,
                                                width: (n.duration! / 1000) * settings.zoom,
                                                backgroundColor: tickColor,
                                                transform: 'translate(0, -50%)', 
                                                zIndex: 35
                                            }}
                                        />
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </div>

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