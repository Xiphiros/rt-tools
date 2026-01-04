import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useEditor } from '../store/EditorContext';
import { TimelineGrid } from './TimelineGrid';
import { TimelineRuler } from './TimelineRuler';
import { MiniPlayfield } from './MiniPlayfield';
import { Waveform } from './Waveform';
import { EditorNote } from '../types';
import { getSnapColor, getSnapDivisor } from '../utils/snapColors';
import { snapTime, getActiveTimingPoint } from '../utils/timing';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWaveSquare } from '@fortawesome/free-solid-svg-icons';

// Simple debounce helper
function useDebouncedSeek(callback: (time: number) => void, delay: number) {
    const callbackRef = useRef(callback);
    useEffect(() => { callbackRef.current = callback; }, [callback]);
    
    return useMemo(() => {
        let timer: any;
        return (time: number) => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                callbackRef.current(time);
            }, delay);
        };
    }, [delay]);
}

export const EditorTimeline = () => {
    const { mapData, settings, setSettings, playback, dispatch, audio, activeTool } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [showWaveform, setShowWaveform] = useState(true);
    const [hoverTime, setHoverTime] = useState(0);
    const [hoveredChord, setHoveredChord] = useState<{ time: number, notes: EditorNote[], x: number, y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, time: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number, time: number } | null>(null);

    // Debounced seek for smooth scrolling
    const debouncedSeek = useDebouncedSeek((time) => {
        audio.seek(time);
    }, 50); // 50ms delay to prevent audio engine stutter

    const tickGroups = useMemo(() => {
        const groups = new Map<string, EditorNote[]>();

        mapData.notes.forEach(note => {
            const key = note.time.toFixed(3); 
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(note);
        });

        return Array.from(groups.entries()).map(([timeStr, notes]) => {
            const time = parseFloat(timeStr);
            const tp = getActiveTimingPoint(time, mapData.timingPoints);
            const bpm = tp ? tp.bpm : mapData.bpm;
            const offset = tp ? tp.time : mapData.offset;
            const msPerBeat = 60000 / bpm;

            const beatIndex = (time - offset) / msPerBeat;
            const snap = getSnapDivisor(beatIndex);
            const color = snap > 0 ? getSnapColor(snap) : '#FFFFFF'; 
            return { time, notes, color, isUnsnapped: snap === 0 };
        });
    }, [mapData.notes, mapData.timingPoints, mapData.bpm, mapData.offset]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            
            if (e.ctrlKey) {
                const delta = e.deltaY > 0 ? -25 : 25;
                setSettings(s => ({ ...s, zoom: Math.max(50, Math.min(500, s.zoom + delta)) }));
            } else {
                // When scrolling, calculate target and seek
                // To prevent stutter, we can pause temporarily or debounce
                // Ideally: If playing, pause -> scroll -> resume?
                // Current approach: Just seek (debounced)
                
                const direction = e.deltaY > 0 ? 1 : -1;
                const tp = getActiveTimingPoint(playback.currentTime, mapData.timingPoints);
                const bpm = tp ? tp.bpm : 120;
                const msPerBeat = 60000 / bpm;
                const step = msPerBeat / settings.snapDivisor;

                const rawTarget = playback.currentTime + (step * direction);
                const cleanTarget = snapTime(rawTarget, mapData.timingPoints, settings.snapDivisor);
                
                // If the user is scrolling rapidly, we want to update the Visuals immediately
                // but the Audio engine lazily.
                // However, playback.currentTime IS the source of truth for visuals currently (via Context).
                // We need to optimistically update playback.currentTime in context without waiting for audio?
                // For now, using debounced seek is safer.
                debouncedSeek(cleanTarget);
            }
        };
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [setSettings, playback.currentTime, mapData.timingPoints, settings.snapDivisor, debouncedSeek]);

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
            const seekTime = settings.snappingEnabled 
                ? snapTime(rawTime, mapData.timingPoints, settings.snapDivisor)
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

        const snapped = snapTime(rawTime, mapData.timingPoints, settings.snapDivisor);
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

    // Auto-Scroll during playback
    useEffect(() => {
        // Only scroll if playing to avoid fighting with user scroll
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
            <div className="animate-in fade-in zoom-in-95 duration-100 mb-2 drop-shadow-2xl">
                <MiniPlayfield notes={hoveredChord.notes} scale={0.35} />
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#222] border-t-solid" />
            </div>
        </div>
    ) : null;

    const playheadColor = useMemo(() => {
        const defaultColor = '#FACC15'; 
        if (playback.isPlaying) return defaultColor;
        const tp = getActiveTimingPoint(playback.currentTime, mapData.timingPoints);
        if (!tp) return defaultColor;
        const msPerBeat = 60000 / tp.bpm;
        const diff = playback.currentTime - tp.time;
        const beatIndex = diff / msPerBeat;
        const snap = getSnapDivisor(beatIndex);
        return snap > 0 ? getSnapColor(snap) : defaultColor;
    }, [playback.currentTime, playback.isPlaying, mapData.timingPoints]);

    return (
        <div className="flex-1 flex flex-col bg-background relative select-none h-full">
            {createPortal(tooltip, document.body)}

            <div className="absolute top-0 left-0 z-50 p-1">
                <button 
                    onClick={() => setShowWaveform(!showWaveform)}
                    className="w-6 h-6 bg-card border border-border rounded flex items-center justify-center text-xs text-muted hover:text-white transition-colors shadow-md"
                    title="Toggle Waveform"
                >
                    <FontAwesomeIcon icon={faWaveSquare} className={showWaveform ? "text-primary" : "text-muted"} />
                </button>
            </div>

            <div 
                ref={containerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar h-full group"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { handleMouseUp(); setHoveredChord(null); }}
            >
                <div 
                    className="relative flex flex-col min-h-full" 
                    style={{ width: (playback.duration / 1000) * settings.zoom, minWidth: '100%' }}
                >
                    <div className="absolute inset-0 z-0">
                        <TimelineGrid 
                            duration={playback.duration} 
                            timingPoints={mapData.timingPoints} 
                            settings={settings} 
                        />
                    </div>

                    {isDragging && dragStart && dragCurrent && (
                        <div 
                            className="absolute top-0 bottom-0 bg-blue-500/20 border-x border-blue-400 z-20 pointer-events-none"
                            style={{
                                left: Math.min(dragStart.x, dragCurrent.x),
                                width: Math.abs(dragCurrent.x - dragStart.x)
                            }}
                        />
                    )}

                    {!playback.isPlaying && (
                        <div className="absolute top-0 bottom-0 w-[1px] bg-white/30 pointer-events-none z-30" style={{ left: (hoverTime / 1000) * settings.zoom }} />
                    )}
                    <div 
                        className="absolute top-0 bottom-0 z-50 pointer-events-none will-change-transform"
                        style={{ 
                            left: (playback.currentTime / 1000) * settings.zoom,
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <div 
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px]" 
                            style={{ borderTopColor: playheadColor }}
                        />
                        <div 
                            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                            style={{ backgroundColor: playheadColor }}
                        />
                    </div>

                    <div className="sticky top-0 z-40">
                        <TimelineRuler 
                            duration={playback.duration} 
                            timingPoints={mapData.timingPoints} 
                            zoom={settings.zoom} 
                            snapDivisor={settings.snapDivisor} 
                        />
                    </div>

                    <div 
                        className="relative w-full transition-all duration-300 ease-in-out overflow-hidden border-b border-white/5 bg-black/20"
                        style={{ height: showWaveform ? '80px' : '0px' }}
                    >
                        <div className="absolute inset-0 z-10 opacity-80">
                            {/* Passed buffer from manager safely */}
                            <Waveform 
                                buffer={audio.manager.getBuffer()} 
                                zoom={settings.zoom} 
                                duration={playback.duration} 
                                height={80}
                            />
                        </div>
                    </div>

                    <div className="flex-1 relative min-h-[120px] z-30 mt-2">
                        {tickGroups.map(group => {
                            const isSelected = group.notes.some(n => n.selected);
                            const tickColor = group.color;
                            
                            const rawCalc = settings.zoom / 30;
                            let width = Math.max(4, Math.round(rawCalc));
                            if (width % 2 !== 0) width++;
                            if (group.isUnsnapped) width = 2;

                            const bgStyle: React.CSSProperties = {
                                background: isSelected 
                                    ? `linear-gradient(to bottom, #ffffff 0%, ${tickColor} 40%, ${tickColor} 100%)`
                                    : (group.isUnsnapped ? '#fff' : tickColor),
                                opacity: group.isUnsnapped ? 0.8 : 1,
                                border: isSelected ? '1px solid white' : 'none',
                                boxShadow: isSelected 
                                    ? `0 0 8px ${tickColor}, 0 0 2px white` 
                                    : (group.isUnsnapped ? 'none' : `0 0 4px ${tickColor}80`),
                                zIndex: isSelected ? 50 : 40
                            };

                            return (
                                <React.Fragment key={group.time}>
                                    <div
                                        className="absolute top-1/2 cursor-pointer pointer-events-auto transition-transform hover:scale-y-110"
                                        style={{
                                            left: (group.time / 1000) * settings.zoom,
                                            width: width,
                                            height: '60%', 
                                            borderRadius: '4px',
                                            transform: 'translate(-50%, -50%)',
                                            ...bgStyle
                                        }}
                                        onMouseEnter={(e) => handleTickEnter(e, group.time, group.notes)}
                                        onMouseLeave={() => setHoveredChord(null)}
                                    />
                                    
                                    {group.notes.map((n) => n.type === 'hold' && (
                                        <div 
                                            key={`${n.id}_tail`}
                                            className="absolute top-1/2 h-1.5 opacity-40 pointer-events-none rounded-r-full"
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
                </div>
            </div>
        </div>
    );
};