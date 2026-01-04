import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useEditor } from '../store/EditorContext';
import { TimelineGrid } from './TimelineGrid';
import { TimelineRuler } from './TimelineRuler';
import { MiniPlayfield } from './MiniPlayfield';
import { Waveform, WaveformMode } from './Waveform';
import { EditorNote } from '../types';
import { getSnapColor, getSnapDivisor } from '../utils/snapColors';
import { snapTime, getActiveTimingPoint } from '../utils/timing';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWaveSquare, faDrum, faMusic } from '@fortawesome/free-solid-svg-icons';
import debounce from 'lodash.debounce'; 

type DragMode = 'select' | 'move' | 'resize';

export const EditorTimeline = () => {
    const { mapData, settings, setSettings, playback, dispatch, audio, activeTool } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    
    // UI State
    const [waveformMode, setWaveformMode] = useState<WaveformMode>('full');
    const [hoverTime, setHoverTime] = useState(0);
    const [hoveredChord, setHoveredChord] = useState<{ time: number, notes: EditorNote[], x: number, y: number } | null>(null);
    
    // Drag State
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState<DragMode>('select');
    const [dragStart, setDragStart] = useState<{ x: number, time: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number, time: number } | null>(null);
    const [initialSelection, setInitialSelection] = useState<EditorNote[]>([]);
    
    // Using this to track resize target, even if TS flagged it as unused before, it is needed for logic
    const [, setResizeTargetId] = useState<string | null>(null);

    // Audio Debounce
    const debouncedSeek = useMemo(
        () => debounce((time: number) => audio.seek(time), 50),
        [audio]
    );

    // --- AGGREGATION ---
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

    // --- ZOOM & SEEK ---
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            
            if (e.ctrlKey) {
                const delta = e.deltaY > 0 ? -25 : 25;
                setSettings(s => ({ ...s, zoom: Math.max(50, Math.min(500, s.zoom + delta)) }));
            } else {
                const direction = e.deltaY > 0 ? 1 : -1;
                const tp = getActiveTimingPoint(playback.currentTime, mapData.timingPoints);
                const bpm = tp ? tp.bpm : 120;
                const msPerBeat = 60000 / bpm;
                const step = msPerBeat / settings.snapDivisor;

                const rawTarget = playback.currentTime + (step * direction);
                const cleanTarget = snapTime(rawTarget, mapData.timingPoints, settings.snapDivisor);
                
                debouncedSeek(cleanTarget);
            }
        };
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [setSettings, playback.currentTime, mapData.timingPoints, settings.snapDivisor, debouncedSeek]);

    // --- MOUSE HANDLERS ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
        const rawTime = (clickX / settings.zoom) * 1000;

        if (e.button === 0) {
            if (activeTool === 'select') {
                setDragMode('select');
                setIsDragging(true);
                setDragStart({ x: clickX, time: rawTime });
                setDragCurrent({ x: clickX, time: rawTime });
            } else {
                const seekTime = settings.snappingEnabled 
                    ? snapTime(rawTime, mapData.timingPoints, settings.snapDivisor)
                    : rawTime;
                audio.seek(seekTime);
            }
        }
    };

    const handleNoteMouseDown = (e: React.MouseEvent, note: EditorNote) => {
        e.stopPropagation();
        if (e.button !== 0) return;

        if (note.selected || e.ctrlKey) {
            setDragMode('move');
            setDragStart({ x: e.clientX, time: note.time });
            setDragCurrent({ x: e.clientX, time: note.time });
            
            if (!note.selected && !e.ctrlKey) {
                dispatch({ type: 'SELECT_NOTES', payload: { ids: [note.id], append: false } });
                setInitialSelection([{ ...note, selected: true }]);
            } else {
                const selected = mapData.notes.filter(n => n.selected);
                if (!note.selected) selected.push(note); 
                setInitialSelection(selected);
            }
            setIsDragging(true);
        } else {
            dispatch({ type: 'SELECT_NOTES', payload: { ids: [note.id], append: false } });
            setInitialSelection([{ ...note, selected: true }]);
            setDragMode('move');
            setDragStart({ x: e.clientX, time: note.time });
            setDragCurrent({ x: e.clientX, time: note.time });
            setIsDragging(true);
        }
    };

    const handleResizeMouseDown = (e: React.MouseEvent, note: EditorNote) => {
        e.stopPropagation();
        if (e.button !== 0) return;

        setDragMode('resize');
        setResizeTargetId(note.id);
        setInitialSelection([note]); 
        
        setDragStart({ x: e.clientX, time: note.time + (note.duration || 0) });
        setDragCurrent({ x: e.clientX, time: note.time + (note.duration || 0) });
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft;
        const rawTime = (x / settings.zoom) * 1000;

        const snapped = snapTime(rawTime, mapData.timingPoints, settings.snapDivisor);
        setHoverTime(snapped);

        if (!isDragging || !dragStart) return;

        if (dragMode === 'select') {
            setDragCurrent({ x: x, time: rawTime });
        } else if (dragMode === 'move') {
            const pixelDelta = e.clientX - dragStart.x;
            const timeDelta = (pixelDelta / settings.zoom) * 1000;
            
            initialSelection.forEach(note => {
                let newTime = note.time + timeDelta;
                if (settings.snappingEnabled) {
                    newTime = snapTime(newTime, mapData.timingPoints, settings.snapDivisor);
                }
                newTime = Math.max(0, newTime); 

                dispatch({
                    type: 'UPDATE_NOTE',
                    payload: { id: note.id, changes: { time: newTime } }
                });
            });
        } else if (dragMode === 'resize') {
            const pixelDelta = e.clientX - dragStart.x;
            const timeDelta = (pixelDelta / settings.zoom) * 1000;
            
            const note = initialSelection[0];
            if (note) {
                const originalEndTime = note.time + (note.duration || 0);
                let newEndTime = originalEndTime + timeDelta;
                
                if (settings.snappingEnabled) {
                    newEndTime = snapTime(newEndTime, mapData.timingPoints, settings.snapDivisor);
                }
                
                let newDuration = Math.max(0, newEndTime - note.time);
                
                dispatch({
                    type: 'UPDATE_NOTE',
                    payload: { id: note.id, changes: { duration: newDuration, type: newDuration > 0 ? 'hold' : 'tap' } }
                });
            }
        }
    };

    const handleMouseUp = () => {
        // Handle Click-to-Seek inside Grid (if not dragged)
        if (isDragging && dragMode === 'select' && dragStart && dragCurrent) {
            const dx = Math.abs(dragCurrent.x - dragStart.x);
            if (dx < 5) {
                // Seek
                const seekTime = settings.snappingEnabled 
                    ? snapTime(dragStart.time, mapData.timingPoints, settings.snapDivisor)
                    : dragStart.time;
                audio.seek(seekTime);
                dispatch({ type: 'DESELECT_ALL' });
            } else {
                // Select Box
                const t1 = Math.min(dragStart.time, dragCurrent.time);
                const t2 = Math.max(dragStart.time, dragCurrent.time);
                const selectedIds = mapData.notes
                    .filter(n => n.time >= t1 && n.time <= t2)
                    .map(n => n.id);
                dispatch({ type: 'SELECT_NOTES', payload: { ids: selectedIds, append: false } });
            }
        }

        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
        setResizeTargetId(null);
        setInitialSelection([]);
        setDragMode('select');
    };

    // Auto-Scroll
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

    const isDraggingSelection = isDragging && dragMode === 'select' && dragStart && dragCurrent && Math.abs(dragCurrent.x - dragStart.x) >= 5;

    return (
        <div 
            className="flex-1 flex flex-col bg-background relative select-none h-full"
            onMouseUp={handleMouseUp}
        >
            {createPortal(tooltip, document.body)}

            <div className="absolute top-0 left-0 z-50 p-2 flex flex-col gap-2">
                <button 
                    onClick={() => setSettings(s => ({ ...s, showWaveform: !s.showWaveform }))}
                    className={`w-8 h-8 bg-card border border-border rounded flex items-center justify-center text-xs transition-colors shadow-md ${settings.showWaveform ? 'text-white' : 'text-muted'}`}
                    title={settings.showWaveform ? "Collapse Waveform" : "Expand Waveform"}
                >
                    <FontAwesomeIcon icon={faWaveSquare} />
                </button>

                {settings.showWaveform && (
                    <div className="flex flex-col gap-1 bg-card border border-border rounded p-1 shadow-md animate-in fade-in slide-in-from-top-2">
                        <button 
                            onClick={() => setWaveformMode('full')}
                            className={`w-6 h-6 rounded flex items-center justify-center text-[10px] transition-colors ${waveformMode === 'full' ? 'bg-primary text-black' : 'text-muted hover:text-white'}`}
                            title="Full Range"
                        >
                            ALL
                        </button>
                        <button 
                            onClick={() => setWaveformMode('bass')}
                            className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${waveformMode === 'bass' ? 'bg-danger text-white' : 'text-muted hover:text-white'}`}
                            title="Bass / Kick Focus (< 140Hz)"
                        >
                            <FontAwesomeIcon icon={faDrum} />
                        </button>
                        <button 
                            onClick={() => setWaveformMode('treble')}
                            className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${waveformMode === 'treble' ? 'bg-secondary text-white' : 'text-muted hover:text-white'}`}
                            title="Treble / Vocal Focus (> 2kHz)"
                        >
                            <FontAwesomeIcon icon={faMusic} />
                        </button>
                    </div>
                )}
            </div>

            <div 
                ref={containerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar h-full group"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseLeave={() => setHoveredChord(null)}
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

                    {isDraggingSelection && (
                        <div 
                            className="absolute top-0 bottom-0 bg-blue-500/20 border-x border-blue-400 z-20 pointer-events-none"
                            style={{
                                left: Math.min(dragStart!.x, dragCurrent!.x),
                                width: Math.abs(dragCurrent!.x - dragStart!.x)
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
                        style={{ height: settings.showWaveform ? '80px' : '0px' }}
                    >
                        <div className="absolute inset-0 z-10 opacity-80">
                            {/* TILED WAVEFORM */}
                            <Waveform 
                                buffer={audio.manager.getBuffer()} 
                                zoom={settings.zoom} 
                                duration={playback.duration} 
                                height={80}
                                mode={waveformMode} 
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
                                zIndex: isSelected ? 50 : 40,
                                cursor: 'grab'
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
                                        onMouseDown={(e) => handleNoteMouseDown(e, group.notes[0])}
                                    />
                                    
                                    {group.notes.map((n) => n.type === 'hold' && (
                                        <React.Fragment key={`${n.id}_hold`}>
                                            <div 
                                                className="absolute top-1/2 h-1.5 opacity-40 pointer-events-none rounded-r-full"
                                                style={{
                                                    left: (group.time / 1000) * settings.zoom,
                                                    width: (n.duration! / 1000) * settings.zoom,
                                                    backgroundColor: tickColor,
                                                    transform: 'translate(0, -50%)', 
                                                    zIndex: 35
                                                }}
                                            />
                                            <div
                                                className="absolute top-1/2 w-3 h-6 bg-white/20 hover:bg-white/80 cursor-col-resize z-50 rounded-sm transition-colors border border-white/30"
                                                style={{
                                                    left: ((group.time + (n.duration || 0)) / 1000) * settings.zoom,
                                                    transform: 'translate(-50%, -50%)',
                                                }}
                                                onMouseDown={(e) => handleResizeMouseDown(e, n)}
                                                title="Resize Hold"
                                            />
                                        </React.Fragment>
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