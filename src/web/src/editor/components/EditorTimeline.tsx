import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useEditor } from '../store/EditorContext';
import { TimelineGrid } from './TimelineGrid';
import { TimelineRuler } from './TimelineRuler';
import { MiniPlayfield } from './MiniPlayfield';
import { Waveform, WaveformMode } from './Waveform';
import { EditorNote, EditorLayer } from '../types';
import { getSnapColor, getSnapDivisor } from '../utils/snapColors';
import { snapTime, getActiveTimingPoint } from '../utils/timing';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWaveSquare, faDrum, faMusic } from '@fortawesome/free-solid-svg-icons';
import debounce from 'lodash.debounce'; 
import { useVirtualWindow } from '../hooks/useVirtualWindow';
import { getVisibleNotes, getVisibleTimingPoints } from '../utils/binarySearch';

type DragMode = 'select' | 'move' | 'resize';

const TIMELINE_PADDING = 300; // px
const TRACK_HEIGHT = 120; // px
const ROW_HEIGHT = TRACK_HEIGHT / 3; // 40px

export const EditorTimeline = () => {
    const { mapData, settings, setSettings, playback, dispatch, audio, activeTool, activeLayerId } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null); // Ref for the note track area
    
    const windowState = useVirtualWindow({
        containerRef,
        zoom: settings.zoom,
        totalDuration: playback.duration,
        bufferPx: 1000,
        contentOffset: TIMELINE_PADDING
    });

    const [waveformMode, setWaveformMode] = useState<WaveformMode>('full');
    const [hoverTime, setHoverTime] = useState(0);
    const [hoveredChord, setHoveredChord] = useState<{ time: number, notes: EditorNote[], x: number, y: number } | null>(null);
    
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState<DragMode>('select');
    
    // Drag State
    const [dragStart, setDragStart] = useState<{ x: number, y: number, time: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number, y: number, time: number } | null>(null);
    
    interface InitialNoteState extends EditorNote {
        originalTime: number;
        originalDuration: number;
        originalColumn: number;
    }
    const [initialSelection, setInitialSelection] = useState<InitialNoteState[]>([]);
    const [resizeHandleNoteId, setResizeHandleNoteId] = useState<string | null>(null);
    
    const debouncedSeek = useMemo(
        () => debounce((time: number) => audio.seek(time), 50),
        [audio]
    );

    // --- LAYER LOOKUP ---
    const layerMap = useMemo(() => {
        return new Map<string, EditorLayer>(mapData.layers.map(l => [l.id, l]));
    }, [mapData.layers]);

    // --- VISIBLE NOTES ---
    const visibleNotes = useMemo(() => {
        const notes = getVisibleNotes(
            mapData.notes, 
            windowState.startTime, 
            windowState.endTime
        );
        return notes.filter(n => {
            const layer = layerMap.get(n.layerId);
            return layer ? layer.visible : true;
        });
    }, [mapData.notes, windowState.startTime, windowState.endTime, layerMap]);

    const visibleTimingPoints = useMemo(() => {
        return getVisibleTimingPoints(mapData.timingPoints, windowState.startTime, windowState.endTime);
    }, [mapData.timingPoints, windowState.startTime, windowState.endTime]);

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
    const getTimeFromEvent = (e: React.MouseEvent) => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft;
        
        const contentX = clickX - TIMELINE_PADDING;
        const rawTime = (contentX / settings.zoom) * 1000;
        return Math.max(0, rawTime);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) {
            const rawTime = getTimeFromEvent(e);
            const containerRect = containerRef.current!.getBoundingClientRect();
            const clickX = e.clientX - containerRect.left + containerRef.current!.scrollLeft;
            const clickY = e.clientY;

            if (activeTool === 'select') {
                setDragMode('select');
                setIsDragging(true);
                setDragStart({ x: clickX, y: clickY, time: rawTime });
                setDragCurrent({ x: clickX, y: clickY, time: rawTime });
                // If not clicking a note (handled by stopPropagation), verify deselect logic in MouseUp
            } else {
                const seekTime = settings.snappingEnabled 
                    ? snapTime(rawTime, mapData.timingPoints, settings.snapDivisor)
                    : rawTime;
                audio.seek(seekTime);
            }
        }
    };

    const isNoteLocked = (note: EditorNote) => {
        const layer = layerMap.get(note.layerId);
        return layer ? layer.locked : false;
    };

    const handleNoteMouseDown = (e: React.MouseEvent, note: EditorNote) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        if (isNoteLocked(note)) return;

        // Calculate initial Y offset for accurate row dragging
        // We track where the mouse is relative to the screen to calculate deltaY
        const startY = e.clientY;

        if (note.selected || e.ctrlKey) {
            setDragMode('move');
            setDragStart({ x: e.clientX, y: startY, time: note.time });
            setDragCurrent({ x: e.clientX, y: startY, time: note.time });
            
            const selectedForMove = mapData.notes.filter(n => n.selected && !isNoteLocked(n)).map(n => ({
                ...n,
                originalTime: n.time,
                originalDuration: n.duration || 0,
                originalColumn: n.column
            }));

            if (!note.selected && !e.ctrlKey) {
                 dispatch({ type: 'SELECT_NOTES', payload: { ids: [note.id], append: false } });
                 selectedForMove.push({ ...note, selected: true, originalTime: note.time, originalDuration: note.duration || 0, originalColumn: note.column });
            }
            setInitialSelection(selectedForMove);
            setIsDragging(true);
        } else {
            dispatch({ type: 'SELECT_NOTES', payload: { ids: [note.id], append: false } });
            setInitialSelection([{ ...note, selected: true, originalTime: note.time, originalDuration: note.duration || 0, originalColumn: note.column }]);
            setDragMode('move');
            setDragStart({ x: e.clientX, y: startY, time: note.time });
            setDragCurrent({ x: e.clientX, y: startY, time: note.time });
            setIsDragging(true);
        }
    };

    const handleResizeMouseDown = (e: React.MouseEvent, note: EditorNote) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        if (isNoteLocked(note)) return;

        setDragMode('resize');
        setResizeHandleNoteId(note.id); 
        
        const selectedHolds = mapData.notes.filter(n => n.selected && n.type === 'hold' && !isNoteLocked(n)).map(n => ({
            ...n,
            originalTime: n.time,
            originalDuration: n.duration || 0,
            originalColumn: n.column
        }));

        if (!selectedHolds.some(n => n.id === note.id)) {
            selectedHolds.push({ ...note, originalTime: note.time, originalDuration: note.duration || 0, originalColumn: note.column });
            dispatch({ type: 'SELECT_NOTES', payload: { ids: [note.id], append: false } });
        }
        
        setInitialSelection(selectedHolds); 
        const endTime = note.time + (note.duration || 0);
        setDragStart({ x: e.clientX, y: e.clientY, time: endTime }); 
        setDragCurrent({ x: e.clientX, y: e.clientY, time: endTime });
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        
        const rawTime = getTimeFromEvent(e);
        const snapped = snapTime(rawTime, mapData.timingPoints, settings.snapDivisor);
        setHoverTime(snapped);

        if (!isDragging || !dragStart) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const currentX = e.clientX - containerRect.left + containerRef.current.scrollLeft;
        
        if (dragMode === 'select') {
            setDragCurrent({ x: currentX, y: e.clientY, time: rawTime });
        } else if (dragMode === 'move') {
            const pixelDeltaX = e.clientX - dragStart.x;
            const pixelDeltaY = e.clientY - dragStart.y;
            
            const timeDelta = (pixelDeltaX / settings.zoom) * 1000;
            
            // Calculate Row Delta
            // Moving down adds to column index (0 -> 1 -> 2)
            // Threshold is slightly sticky to prevent accidental row swaps
            const rowDelta = Math.round(pixelDeltaY / ROW_HEIGHT);
            
            initialSelection.forEach(note => {
                let newTime = note.originalTime + timeDelta;
                let newColumn = note.originalColumn + rowDelta;

                // Snap X
                if (settings.snappingEnabled) {
                    newTime = snapTime(newTime, mapData.timingPoints, settings.snapDivisor);
                }
                newTime = Math.max(0, newTime); 

                // Clamp Y
                newColumn = Math.max(0, Math.min(2, newColumn));

                if (Math.abs(newTime - note.time) > 0.001 || newColumn !== note.column) {
                    dispatch({
                        type: 'UPDATE_NOTE',
                        payload: { id: note.id, changes: { time: newTime, column: newColumn } }
                    });
                }
            });
        } else if (dragMode === 'resize') {
            let targetEndTime = rawTime;
            if (settings.snappingEnabled) {
                targetEndTime = snapTime(rawTime, mapData.timingPoints, settings.snapDivisor);
            }
            
            initialSelection.forEach(note => {
                let newDuration = Math.max(0, targetEndTime - note.originalTime);
                if (newDuration !== note.duration) {
                    dispatch({
                        type: 'UPDATE_NOTE',
                        payload: { id: note.id, changes: { duration: newDuration, type: newDuration > 0 ? 'hold' : 'tap' } }
                    });
                }
            });
        }
    };

    const handleMouseUp = () => {
        if (isDragging && dragMode === 'select' && dragStart && dragCurrent) {
            const dx = Math.abs(dragCurrent.x - dragStart.x);
            // If click (not drag), move playhead & deselect
            if (dx < 5) {
                const seekTime = settings.snappingEnabled 
                    ? snapTime(dragStart.time, mapData.timingPoints, settings.snapDivisor)
                    : dragStart.time;
                audio.seek(seekTime);
                dispatch({ type: 'DESELECT_ALL' });
            } else {
                // Box Selection Logic
                // We need to calculate the time range covered by the selection box
                const t1 = Math.min(dragStart.time, dragCurrent.time);
                const t2 = Math.max(dragStart.time, dragCurrent.time);
                
                // We also need to calculate the Y range (Rows)
                // Convert screen Y to Track Y
                if (trackRef.current) {
                    const trackRect = trackRef.current.getBoundingClientRect();
                    const startY = dragStart.y - trackRect.top;
                    const endY = dragCurrent.y - trackRect.top;
                    
                    const y1 = Math.min(startY, endY);
                    const y2 = Math.max(startY, endY);

                    const selectedIds = mapData.notes
                        .filter(n => {
                            const layer = layerMap.get(n.layerId);
                            const isVisible = layer ? layer.visible : true;
                            const isLocked = layer ? layer.locked : false;
                            
                            // Check Time Intersection
                            const inTime = n.time >= t1 && n.time <= t2;
                            
                            // Check Row Intersection
                            const noteTop = n.column * ROW_HEIGHT;
                            const noteBottom = noteTop + ROW_HEIGHT;
                            // Simple AABB intersection: Note overlaps SelectionBoxY
                            const inRow = (noteTop < y2 && noteBottom > y1);

                            return inTime && inRow && isVisible && !isLocked;
                        })
                        .map(n => n.id);
                        
                    dispatch({ type: 'SELECT_NOTES', payload: { ids: selectedIds, append: false } });
                }
            }
        }

        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
        setResizeHandleNoteId(null);
        setInitialSelection([]);
        setDragMode('select');
    };

    useEffect(() => {
        if (playback.isPlaying && containerRef.current) {
            const songPx = (playback.currentTime / 1000) * settings.zoom;
            const centerOffset = containerRef.current.clientWidth / 2;
            const scrollPos = songPx + TIMELINE_PADDING - centerOffset;
            containerRef.current.scrollLeft = scrollPos;
        }
    }, [playback.currentTime, playback.isPlaying, settings.zoom]);

    const handleTickEnter = (e: React.MouseEvent, time: number, notes: EditorNote[]) => {
        // Optional: Tooltip logic if needed for dense clusters
    };

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

    const contentWidth = (playback.duration / 1000) * settings.zoom;
    const totalWidth = contentWidth + (TIMELINE_PADDING * 2);

    return (
        <div 
            className="flex-1 flex flex-col bg-background relative select-none h-full"
            onMouseUp={handleMouseUp}
        >
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
                {/* Sizer Div */}
                <div 
                    className="relative flex flex-col min-h-full" 
                    style={{ width: totalWidth, minWidth: '100%' }}
                >
                    {/* Content Wrapper */}
                    <div 
                        className="relative flex flex-col h-full"
                        style={{ marginLeft: TIMELINE_PADDING, width: contentWidth }}
                    >
                        {/* Background Grid */}
                        <div className="absolute inset-0 z-0">
                            <TimelineGrid 
                                duration={playback.duration} 
                                timingPoints={visibleTimingPoints} 
                                settings={settings} 
                            />
                        </div>

                        {/* Selection Box */}
                        {isDraggingSelection && (
                            <div 
                                className="absolute top-0 bottom-0 bg-blue-500/20 border-x border-blue-400 z-50 pointer-events-none"
                                style={{
                                    left: Math.min(dragStart!.x - TIMELINE_PADDING, dragCurrent!.x - TIMELINE_PADDING),
                                    width: Math.abs(dragCurrent!.x - dragStart!.x)
                                }}
                            />
                        )}

                        {/* Hover Line */}
                        {!playback.isPlaying && (
                            <div className="absolute top-0 bottom-0 w-[1px] bg-white/30 pointer-events-none z-30" style={{ left: (hoverTime / 1000) * settings.zoom }} />
                        )}
                        
                        {/* Playhead */}
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

                        {/* Ruler */}
                        <div className="sticky top-0 z-40">
                            <TimelineRuler 
                                duration={playback.duration} 
                                timingPoints={visibleTimingPoints} 
                                zoom={settings.zoom} 
                                snapDivisor={settings.snapDivisor} 
                            />
                        </div>

                        {/* Waveform */}
                        <div 
                            className="relative w-full transition-all duration-300 ease-in-out overflow-hidden border-b border-white/5 bg-black/20"
                            style={{ height: settings.showWaveform ? '80px' : '0px' }}
                        >
                            <div className="absolute inset-0 z-10 opacity-80">
                                <Waveform 
                                    buffer={audio.manager.getBuffer()} 
                                    zoom={settings.zoom} 
                                    duration={playback.duration} 
                                    height={80}
                                    mode={waveformMode} 
                                />
                            </div>
                        </div>

                        {/* NOTES TRACK */}
                        <div 
                            ref={trackRef}
                            className="relative z-30 mt-2 border-t border-white/10"
                            style={{ height: TRACK_HEIGHT }}
                        >
                            {/* Lane Dividers */}
                            <div className="absolute inset-0 flex flex-col pointer-events-none">
                                <div className="h-[40px] border-b border-white/5 bg-sky-500/5 relative"><span className="absolute left-1 top-1 text-[8px] text-white/30 font-mono">TOP</span></div>
                                <div className="h-[40px] border-b border-white/5 bg-purple-500/5 relative"><span className="absolute left-1 top-1 text-[8px] text-white/30 font-mono">HOME</span></div>
                                <div className="h-[40px] bg-pink-500/5 relative"><span className="absolute left-1 top-1 text-[8px] text-white/30 font-mono">BOT</span></div>
                            </div>

                            {/* Render Individual Notes */}
                            {visibleNotes.map(note => {
                                const left = (note.time / 1000) * settings.zoom;
                                const width = note.type === 'hold' && note.duration 
                                    ? (note.duration / 1000) * settings.zoom 
                                    : 24; 
                                const top = note.column * ROW_HEIGHT;
                                
                                const noteLayer = layerMap.get(note.layerId);
                                const layerColor = noteLayer ? noteLayer.color : '#fff';
                                const isActiveLayer = note.layerId === activeLayerId;
                                const isLocked = noteLayer ? noteLayer.locked : false;
                                
                                // Dimming
                                const opacity = (isActiveLayer || !settings.dimInactiveLayers) ? 1.0 : 0.4;
                                const isSelected = note.selected;

                                return (
                                    <React.Fragment key={note.id}>
                                        {/* Note Body */}
                                        <div
                                            className={`absolute rounded-sm border shadow-sm cursor-grab active:cursor-grabbing hover:brightness-110 transition-colors flex items-center justify-center select-none ${isLocked ? 'cursor-not-allowed' : ''}`}
                                            style={{
                                                left: left,
                                                top: top + 4, // Padding within row
                                                width: Math.max(width, 12),
                                                height: ROW_HEIGHT - 8,
                                                backgroundColor: isSelected ? '#fff' : (isActiveLayer ? layerColor : '#333'),
                                                borderColor: isSelected ? layerColor : 'transparent',
                                                borderWidth: isSelected ? '2px' : '0px',
                                                opacity: opacity,
                                                zIndex: isSelected ? 100 : 50,
                                                boxShadow: isSelected ? `0 0 10px ${layerColor}80` : 'none'
                                            }}
                                            onMouseDown={(e) => handleNoteMouseDown(e, note)}
                                        >
                                            <span className={`text-[10px] font-bold ${isSelected ? 'text-black' : 'text-white/90'} pointer-events-none`}>
                                                {note.key.toUpperCase()}
                                            </span>
                                        </div>

                                        {/* Hold Handle (Resize) */}
                                        {note.type === 'hold' && !isLocked && (
                                            <div
                                                className={`absolute top-0 bottom-0 w-3 cursor-col-resize hover:bg-white/30 z-[101] flex items-center justify-center rounded-r-sm`}
                                                style={{
                                                    left: left + width - 6,
                                                    top: top + 4,
                                                    height: ROW_HEIGHT - 8,
                                                }}
                                                onMouseDown={(e) => handleResizeMouseDown(e, note)}
                                            >
                                                <div className="w-[1px] h-3 bg-black/50" />
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};