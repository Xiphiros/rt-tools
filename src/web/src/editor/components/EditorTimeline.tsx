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
import debounce from 'lodash.debounce'; 

// --- TYPES ---
type DragMode = 'select' | 'move' | 'resize';

export const EditorTimeline = () => {
    const { mapData, settings, setSettings, playback, dispatch, audio, activeTool } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    
    // UI State
    const [hoverTime, setHoverTime] = useState(0);
    const [hoveredChord, setHoveredChord] = useState<{ time: number, notes: EditorNote[], x: number, y: number } | null>(null);
    
    // Complex Interaction State
    const [dragMode, setDragMode] = useState<DragMode>('select');
    const [dragStart, setDragStart] = useState<{ x: number, time: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number, time: number } | null>(null);
    
    // Snapshot for Moving/Resizing (Original positions before drag)
    const [initialSelection, setInitialSelection] = useState<EditorNote[]>([]);
    const [resizeTargetId, setResizeTargetId] = useState<string | null>(null);

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

    // --- INTERACTION HANDLERS ---

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        
        // 1. Calculate World Time
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
        const rawTime = (clickX / settings.zoom) * 1000;

        // 2. Identify Click Target
        // Did we click a note? (Hit testing logic is simplified here by checking if we hovered a chord)
        // Ideally, we'd check if e.target is a note div, but events bubble.
        // We'll rely on onMouseDown on the Note elements themselves for Move/Resize initiation.
        // If we reached here, it means we clicked empty space -> Seek or Box Select.

        if (e.button === 0) {
            if (activeTool === 'select') {
                setDragMode('select');
                setIsDragging(true);
                setDragStart({ x: clickX, time: rawTime });
                setDragCurrent({ x: clickX, time: rawTime });
            } else {
                // Seek
                const seekTime = settings.snappingEnabled 
                    ? snapTime(rawTime, mapData.timingPoints, settings.snapDivisor)
                    : rawTime;
                audio.seek(seekTime);
            }
        }
    };

    // Called when clicking a specific note head
    const handleNoteMouseDown = (e: React.MouseEvent, note: EditorNote) => {
        e.stopPropagation(); // Stop timeline seek/select
        if (e.button !== 0) return;

        // If dragging selected notes
        if (note.selected || e.ctrlKey) {
            setDragMode('move');
            setDragStart({ x: e.clientX, time: note.time });
            setDragCurrent({ x: e.clientX, time: note.time });
            
            // If dragging an unselected note, select it exclusively (unless ctrl)
            if (!note.selected && !e.ctrlKey) {
                dispatch({ type: 'SELECT_NOTES', payload: { ids: [note.id], append: false } });
                setInitialSelection([{ ...note, selected: true }]);
            } else {
                // Snapshot currently selected notes
                const selected = mapData.notes.filter(n => n.selected);
                // Ensure the clicked note is included if we just Ctrl-clicked it
                if (!note.selected) selected.push(note); 
                setInitialSelection(selected);
            }
            setIsDragging(true);
        } else {
            // Clicked unselected note without modifiers -> Select only this, start move
            dispatch({ type: 'SELECT_NOTES', payload: { ids: [note.id], append: false } });
            setInitialSelection([{ ...note, selected: true }]);
            setDragMode('move');
            setDragStart({ x: e.clientX, time: note.time });
            setDragCurrent({ x: e.clientX, time: note.time });
            setIsDragging(true);
        }
    };

    // Called when clicking a hold tail handle
    const handleResizeMouseDown = (e: React.MouseEvent, note: EditorNote) => {
        e.stopPropagation();
        if (e.button !== 0) return;

        setDragMode('resize');
        setResizeTargetId(note.id);
        setInitialSelection([note]); // Only resizing one at a time for safety usually, or we could batch resize
        
        setDragStart({ x: e.clientX, time: note.time + (note.duration || 0) });
        setDragCurrent({ x: e.clientX, time: note.time + (note.duration || 0) });
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const mouseX = e.clientX - rect.left + scrollLeft;
        const rawTime = (mouseX / settings.zoom) * 1000;

        // Hover Update
        const snapped = snapTime(rawTime, mapData.timingPoints, settings.snapDivisor);
        setHoverTime(snapped);

        if (!isDragging || !dragStart) return;

        // Update Drag State
        // For move/resize, we need global delta from screen coordinates
        // For box select, we need timeline coordinates
        
        if (dragMode === 'select') {
            setDragCurrent({ x: mouseX, time: rawTime });
        } else if (dragMode === 'move') {
            // Delta in MS
            // We calculate delta based on Mouse Movement converted to time
            // DeltaX pixels / Zoom * 1000
            const pixelDelta = e.clientX - dragStart.x;
            const timeDelta = (pixelDelta / settings.zoom) * 1000;
            
            // Apply delta to initial snapshot
            initialSelection.forEach(note => {
                let newTime = note.time + timeDelta;
                if (settings.snappingEnabled) {
                    newTime = snapTime(newTime, mapData.timingPoints, settings.snapDivisor);
                }
                newTime = Math.max(0, newTime); // Clamp

                // Optimistic UI Update (Dispatch immediate)
                // In a real app, we might use a transient state to avoid thrashing redux/history
                // For now, we dispatch update. To prevent history spam, we should probably debounce or use a specific "DRAGGING" action.
                // Simplified: We assume 'UPDATE_NOTE' is fast enough.
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
                
                // Duration cannot be negative
                let newDuration = Math.max(0, newEndTime - note.time);
                
                dispatch({
                    type: 'UPDATE_NOTE',
                    payload: { id: note.id, changes: { duration: newDuration, type: newDuration > 0 ? 'hold' : 'tap' } }
                });
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
        setResizeTargetId(null);
        setInitialSelection([]);

        if (dragMode === 'select' && dragStart && dragCurrent) {
            const t1 = Math.min(dragStart.time, dragCurrent.time);
            const t2 = Math.max(dragStart.time, dragCurrent.time);
            
            if (t2 - t1 < 10) { // Click threshold
                dispatch({ type: 'DESELECT_ALL' });
            } else {
                const selectedIds = mapData.notes
                    .filter(n => n.time >= t1 && n.time <= t2)
                    .map(n => n.id);
                dispatch({ type: 'SELECT_NOTES', payload: { ids: selectedIds, append: false } });
            }
        }
        
        setDragMode('select'); // Reset to default
    };

    const handleTickEnter = (e: React.MouseEvent, time: number, notes: EditorNote[]) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setHoveredChord({
            time,
            notes,
            x: rect.left + (rect.width / 2),
            y: rect.top - 10
        });
    };

    // ... (Tooltip, Playhead color logic same as before) ...
    // Re-paste utility imports if needed, assumed context is clean.
    
    // Playhead Color Logic
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

    // UI Helpers
    const isDraggingSelection = isDragging && dragMode === 'select';

    return (
        <div 
            className="flex-1 flex flex-col bg-background relative select-none h-full"
            onMouseUp={handleMouseUp} // Global mouse up to catch drops outside timeline
        >
            {createPortal(hoveredChord ? (
                <div 
                    className="fixed z-[9999] pointer-events-none transition-all duration-150"
                    style={{ left: hoveredChord.x, top: hoveredChord.y, transform: 'translate(-50%, -100%)' }}
                >
                    <div className="animate-in fade-in zoom-in-95 duration-100 mb-2 drop-shadow-2xl">
                        <MiniPlayfield notes={hoveredChord.notes} scale={0.35} />
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#222] border-t-solid" />
                    </div>
                </div>
            ) : null, document.body)}

            {/* ... Toggle Button ... */}
            <div className="absolute top-0 left-0 z-50 p-1">
                <button 
                    onClick={() => setSettings(s => ({ ...s, showWaveform: !s.showWaveform }))}
                    className="w-6 h-6 bg-card border border-border rounded flex items-center justify-center text-xs text-muted hover:text-white transition-colors shadow-md"
                >
                    <FontAwesomeIcon icon={faWaveSquare} className={settings.showWaveform ? "text-primary" : "text-muted"} />
                </button>
            </div>

            <div 
                ref={containerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar h-full group"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseLeave={() => setHoveredChord(null)}
            >
                <div className="relative flex flex-col min-h-full" style={{ width: (playback.duration / 1000) * settings.zoom, minWidth: '100%' }}>
                    {/* GRID */}
                    <div className="absolute inset-0 z-0">
                        <TimelineGrid duration={playback.duration} timingPoints={mapData.timingPoints} settings={settings} />
                    </div>

                    {/* SELECTION BOX */}
                    {isDraggingSelection && dragStart && dragCurrent && (
                        <div 
                            className="absolute top-0 bottom-0 bg-blue-500/20 border-x border-blue-400 z-20 pointer-events-none"
                            style={{
                                left: Math.min(dragStart.x, dragCurrent.x),
                                width: Math.abs(dragCurrent.x - dragStart.x)
                            }}
                        />
                    )}

                    {/* PLAYHEAD */}
                    {!playback.isPlaying && (
                        <div className="absolute top-0 bottom-0 w-[1px] bg-white/30 pointer-events-none z-30" style={{ left: (hoverTime / 1000) * settings.zoom }} />
                    )}
                    <div 
                        className="absolute top-0 bottom-0 z-50 pointer-events-none will-change-transform"
                        style={{ left: (playback.currentTime / 1000) * settings.zoom, transform: 'translateX(-50%)' }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px]" style={{ borderTopColor: playheadColor }} />
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: playheadColor }} />
                    </div>

                    <div className="sticky top-0 z-40">
                        <TimelineRuler duration={playback.duration} timingPoints={mapData.timingPoints} zoom={settings.zoom} snapDivisor={settings.snapDivisor} />
                    </div>

                    <div className="relative w-full transition-all duration-300 ease-in-out overflow-hidden border-b border-white/5 bg-black/20" style={{ height: settings.showWaveform ? '80px' : '0px' }}>
                        <div className="absolute inset-0 z-10 opacity-80">
                            <Waveform buffer={audio.manager.getBuffer()} zoom={settings.zoom} duration={playback.duration} height={80} />
                        </div>
                    </div>

                    {/* NOTES AREA */}
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
                                boxShadow: isSelected ? `0 0 8px ${tickColor}, 0 0 2px white` : 'none',
                                zIndex: isSelected ? 50 : 40,
                                cursor: 'grab'
                            };

                            return (
                                <React.Fragment key={group.time}>
                                    {/* Note Head */}
                                    <div
                                        className="absolute top-1/2 transition-transform hover:scale-y-110"
                                        style={{
                                            left: (group.time / 1000) * settings.zoom,
                                            width: width,
                                            height: '60%', 
                                            borderRadius: '4px',
                                            transform: 'translate(-50%, -50%)',
                                            ...bgStyle
                                        }}
                                        onMouseEnter={(e) => handleTickEnter(e, group.time, group.notes)}
                                        onMouseDown={(e) => handleNoteMouseDown(e, group.notes[0])} // Start Move
                                    />
                                    
                                    {/* Hold Body & Tail */}
                                    {group.notes.map((n) => n.type === 'hold' && (
                                        <React.Fragment key={`${n.id}_hold`}>
                                            {/* Body */}
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
                                            {/* Resize Handle (Tail) */}
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