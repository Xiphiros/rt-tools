import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from '../store/EditorContext';
import { TimelineGrid } from './TimelineGrid';
import { TimelineRuler } from './TimelineRuler';
import { NoteObject } from './NoteObject';
import { ChordPreview } from './ChordPreview';
import { KEY_TO_ROW, ROW_HEIGHT, ROW_TOP, ROW_BOTTOM } from '../../gameplay/constants';
import { EditorNote } from '../types';

export const EditorTimeline = () => {
    const { mapData, settings, setSettings, playback, dispatch, audio } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [hoverTime, setHoverTime] = useState(0);
    const [hoveredChord, setHoveredChord] = useState<{ time: number, notes: EditorNote[], x: number, y: number } | null>(null);

    // --- ZOOM HANDLER (Ctrl + Wheel) ---
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -25 : 25;
                setSettings(s => ({ 
                    ...s, 
                    zoom: Math.max(50, Math.min(500, s.zoom + delta)) 
                }));
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [setSettings]);

    // --- KEYBOARD INPUT ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            const key = e.key.toLowerCase();
            
            if (KEY_TO_ROW[key] !== undefined) {
                const row = KEY_TO_ROW[key];
                const targetTime = playback.isPlaying ? playback.currentTime : hoverTime;
                const msPerBeat = 60000 / mapData.bpm;
                const snapInterval = msPerBeat / settings.snapDivisor;
                const snappedTime = Math.round(targetTime / snapInterval) * snapInterval;

                dispatch({
                    type: 'ADD_NOTE',
                    payload: {
                        id: crypto.randomUUID(),
                        time: snappedTime,
                        column: row,
                        key: key,
                        type: e.shiftKey ? 'hold' : 'tap',
                        duration: e.shiftKey ? msPerBeat : 0
                    }
                });
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const selectedIds = mapData.notes.filter(n => n.selected).map(n => n.id);
                if (selectedIds.length > 0) dispatch({ type: 'REMOVE_NOTES', payload: selectedIds });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mapData.bpm, mapData.notes, settings.snapDivisor, playback.isPlaying, playback.currentTime, hoverTime, dispatch]);

    // --- MOUSE ---
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
    };

    // Auto-scroll
    useEffect(() => {
        if (playback.isPlaying && containerRef.current) {
            const scrollPos = (playback.currentTime / 1000) * settings.zoom - (containerRef.current.clientWidth / 2);
            containerRef.current.scrollLeft = scrollPos;
        }
    }, [playback.currentTime, playback.isPlaying, settings.zoom]);

    const handleNoteClick = (e: React.MouseEvent, note: EditorNote) => {
        e.stopPropagation();
        dispatch({
            type: 'SELECT_NOTES',
            payload: { ids: [note.id], append: e.ctrlKey || e.shiftKey }
        });
    };

    const handleNoteRightClick = (e: React.MouseEvent, note: EditorNote) => {
        e.preventDefault(); 
        dispatch({ type: 'REMOVE_NOTES', payload: [note.id] });
    };

    const handleNoteEnter = (e: React.MouseEvent, note: EditorNote) => {
        const chordNotes = mapData.notes.filter(n => Math.abs(n.time - note.time) < 5);
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setHoveredChord({
            time: note.time,
            notes: chordNotes,
            x: rect.left,
            y: rect.top - 140
        });
    };

    const handleNoteLeave = () => {
        setHoveredChord(null);
    };

    const handleBgClick = () => {
        if (playback.isPlaying) return;
        audio.seek(hoverTime);
    };

    return (
        <div className="flex-1 flex flex-col bg-background relative select-none h-full">
            {hoveredChord && (
                <div 
                    className="fixed z-[999] pointer-events-none transition-opacity duration-200"
                    style={{ left: hoveredChord.x, top: hoveredChord.y }}
                >
                    <ChordPreview notes={hoveredChord.notes} />
                </div>
            )}

            <div 
                ref={containerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar h-full"
                onMouseMove={handleMouseMove}
                onClick={handleBgClick}
            >
                <div 
                    className="relative"
                    style={{ 
                        width: (playback.duration / 1000) * settings.zoom, 
                        minWidth: '100%',
                        height: '100%' 
                    }}
                >
                    <div className="sticky top-0 z-20">
                        <TimelineRuler 
                            duration={playback.duration} 
                            bpm={mapData.bpm} 
                            zoom={settings.zoom} 
                            snapDivisor={settings.snapDivisor} 
                        />
                    </div>

                    <div className="absolute top-8 bottom-0 left-0 right-0">
                        <TimelineGrid 
                            duration={playback.duration}
                            bpm={mapData.bpm}
                            offset={mapData.offset}
                            settings={settings}
                        />
                    </div>

                    {[ROW_TOP, 1, ROW_BOTTOM].map((rowIdx) => (
                        <div 
                            key={rowIdx}
                            className="absolute left-0 right-0 border-b border-white/5 pointer-events-none"
                            style={{ top: 32 + (rowIdx * ROW_HEIGHT) + (ROW_HEIGHT / 2) }}
                        />
                    ))}

                    <div className="absolute top-8 left-0 right-0 bottom-0 pointer-events-none">
                        {mapData.notes.map(note => (
                            // BUG FIX: Removed double positioning. 
                            // NoteObject internally calculates position based on props.
                            // We just pass the props and ensure NoteObject handles the absolute styles.
                            // However, we need a wrapper for z-indexing or events if NoteObject doesn't expose them.
                            // NoteObject exposes events.
                            // To prevent double offset, we set this wrapper to top:0, left:0.
                            <div key={note.id} className="absolute top-0 left-0 pointer-events-auto">
                                <NoteObject 
                                    note={note}
                                    zoom={settings.zoom}
                                    rowHeight={ROW_HEIGHT}
                                    onClick={handleNoteClick}
                                    onContextMenu={handleNoteRightClick}
                                    onMouseEnter={handleNoteEnter}
                                    onMouseLeave={handleNoteLeave}
                                />
                            </div>
                        ))}
                    </div>

                    {!playback.isPlaying && (
                        <div 
                            className="absolute top-8 bottom-0 w-0.5 bg-white/20 pointer-events-none z-30"
                            style={{ left: (hoverTime / 1000) * settings.zoom }}
                        />
                    )}

                    <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-warning z-40 pointer-events-none shadow-[0_0_15px_rgba(251,191,36,0.8)]"
                        style={{ left: (playback.currentTime / 1000) * settings.zoom }}
                    >
                        <div className="absolute top-0 -left-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-warning" />
                    </div>
                </div>
            </div>
        </div>
    );
};