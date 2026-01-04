import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from '../store/EditorContext';
import { TimelineGrid } from './TimelineGrid';
import { TimelineRuler } from './TimelineRuler';
import { HitCircle } from '../../gameplay/components/HitCircle';
import { NoteObject } from './NoteObject';
import { ChordPreview } from './ChordPreview';
import { KEY_TO_ROW, ROW_HEIGHT, ROW_TOP, ROW_BOTTOM, NOTE_SIZE } from '../../gameplay/constants';
import { EditorNote } from '../types';

export const EditorTimeline = () => {
    const { mapData, settings, playback, dispatch, audio } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    
    // State for Hover Preview
    const [hoverTime, setHoverTime] = useState(0);
    const [hoveredChord, setHoveredChord] = useState<{ time: number, notes: EditorNote[], x: number, y: number } | null>(null);

    // --- KEYBOARD INPUT (Reduced for brevity, logic preserved) ---
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

    // Note Interaction
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

    // --- HOVER PREVIEW LOGIC ---
    const handleNoteEnter = (e: React.MouseEvent, note: EditorNote) => {
        // Find all notes at this timestamp (The Chord)
        const chordNotes = mapData.notes.filter(n => Math.abs(n.time - note.time) < 5); // 5ms tolerance
        
        // Calculate tooltip position relative to viewport
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        
        setHoveredChord({
            time: note.time,
            notes: chordNotes,
            x: rect.left,
            y: rect.top - 140 // Position above
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
        <div className="flex-1 flex flex-col bg-background relative select-none">
            {/* Chord Preview Tooltip (Fixed Overlay) */}
            {hoveredChord && (
                <div 
                    className="fixed z-[999] pointer-events-none transition-opacity duration-200"
                    style={{ left: hoveredChord.x, top: hoveredChord.y }}
                >
                    <ChordPreview notes={hoveredChord.notes} />
                </div>
            )}

            {/* Scrollable Container */}
            <div 
                ref={containerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar"
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
                    {/* 1. Ruler */}
                    <div className="sticky top-0 z-20">
                        <TimelineRuler 
                            duration={playback.duration} 
                            bpm={mapData.bpm} 
                            zoom={settings.zoom} 
                            snapDivisor={settings.snapDivisor} 
                        />
                    </div>

                    {/* 2. Grid */}
                    <div className="absolute top-8 bottom-0 left-0 right-0">
                        <TimelineGrid 
                            duration={playback.duration}
                            bpm={mapData.bpm}
                            offset={mapData.offset}
                            settings={settings}
                        />
                    </div>

                    {/* 3. Row Lines */}
                    {[ROW_TOP, 1, ROW_BOTTOM].map((rowIdx) => (
                        <div 
                            key={rowIdx}
                            className="absolute left-0 right-0 border-b border-white/5 pointer-events-none"
                            style={{ top: 32 + (rowIdx * ROW_HEIGHT) + (ROW_HEIGHT / 2) }}
                        />
                    ))}

                    {/* 4. Notes (Interactive Objects) */}
                    <div className="absolute top-8 left-0 right-0 bottom-0 pointer-events-none">
                        {mapData.notes.map(note => (
                            <div
                                key={note.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: (note.time / 1000) * settings.zoom - (NOTE_SIZE / 2),
                                    top: (note.column * ROW_HEIGHT) + (ROW_HEIGHT / 2) - (NOTE_SIZE / 2)
                                }}
                            >
                                {/* Render actual interactive box over the visual HitCircle */}
                                <NoteObject 
                                    note={note}
                                    zoom={settings.zoom}
                                    rowHeight={ROW_HEIGHT}
                                    onClick={handleNoteClick}
                                    onContextMenu={handleNoteRightClick}
                                    onMouseEnter={handleNoteEnter}
                                    onMouseLeave={handleNoteLeave}
                                />
                                
                                {/* Visual Representation (Behind logic, usually) */}
                                {/* Note: NoteObject currently renders the box. 
                                    If we want the fancy HitCircle style in timeline:
                                    We can replace NoteObject's render with HitCircle logic OR
                                    keep HitCircle for Playfield and use NoteObject (Box) for timeline.
                                    Standard VSRG editors use boxes in timeline for clarity. 
                                    We'll stick to NoteObject (Box) for timeline as implemented in Batch 2 previously.
                                */}
                            </div>
                        ))}
                    </div>

                    {/* 5. Ghost Cursor */}
                    {!playback.isPlaying && (
                        <div 
                            className="absolute top-8 bottom-0 w-0.5 bg-white/20 pointer-events-none z-30"
                            style={{ left: (hoverTime / 1000) * settings.zoom }}
                        />
                    )}

                    {/* 6. Playhead */}
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