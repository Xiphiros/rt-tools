import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from '../store/EditorContext';
import { TimelineGrid } from './TimelineGrid';
import { TimelineRuler } from './TimelineRuler';
import { HitCircle } from '../../gameplay/components/HitCircle';
import { KEY_TO_ROW, ROW_HEIGHT, ROW_TOP, ROW_BOTTOM, NOTE_SIZE } from '../../gameplay/constants';
import { EditorNote } from '../types';

export const EditorTimeline = () => {
    const { mapData, settings, playback, dispatch, audio } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoverTime, setHoverTime] = useState(0);

    // --- KEYBOARD INPUT HANDLING ---
    useEffect(() => {
        const handleKeyDown = (e: React.Event) => {
            // Only process input if not typing in a text field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            
            const event = e as KeyboardEvent;
            const key = event.key.toLowerCase();

            // 1. Check if key maps to a row
            if (KEY_TO_ROW[key] !== undefined) {
                const row = KEY_TO_ROW[key];
                
                // 2. Use Hover Time (if mouse in timeline) OR Playhead Time
                // Default to Playhead if Playing, Snap cursor if Paused/Hovering
                const targetTime = playback.isPlaying ? playback.currentTime : hoverTime;

                // 3. Snap Logic (Global)
                const msPerBeat = 60000 / mapData.bpm;
                const snapInterval = msPerBeat / settings.snapDivisor;
                const snappedTime = Math.round(targetTime / snapInterval) * snapInterval;

                // 4. Dispatch
                dispatch({
                    type: 'ADD_NOTE',
                    payload: {
                        id: crypto.randomUUID(),
                        time: snappedTime,
                        column: row,
                        key: key,
                        type: event.shiftKey ? 'hold' : 'tap', // Shift+Key = Hold Note start
                        duration: event.shiftKey ? msPerBeat : 0 // Default hold length = 1 beat
                    }
                });

                // Play Hitsound (Feedback)
                // In a real app, this would trigger the actual audio engine sample
            }
            
            // Delete Key
            if (event.key === 'Delete' || event.key === 'Backspace') {
                const selectedIds = mapData.notes.filter(n => n.selected).map(n => n.id);
                if (selectedIds.length > 0) {
                    dispatch({ type: 'REMOVE_NOTES', payload: selectedIds });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mapData.bpm, settings.snapDivisor, playback.isPlaying, playback.currentTime, hoverTime, dispatch]);


    // --- MOUSE HANDLING ---
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft;
        
        // Convert X -> Time
        const rawTime = (x / settings.zoom) * 1000;
        
        // Snap for cursor visualization
        const msPerBeat = 60000 / mapData.bpm;
        const snapInterval = msPerBeat / settings.snapDivisor;
        const snapped = Math.round(rawTime / snapInterval) * snapInterval;
        
        setHoverTime(snapped);
    };

    // Auto-scroll logic
    useEffect(() => {
        if (playback.isPlaying && containerRef.current) {
            const scrollPos = (playback.currentTime / 1000) * settings.zoom - (containerRef.current.clientWidth / 2);
            containerRef.current.scrollLeft = scrollPos;
        }
    }, [playback.currentTime, playback.isPlaying, settings.zoom]);

    // Note Selection
    const handleNoteClick = (e: React.MouseEvent, note: EditorNote) => {
        e.stopPropagation();
        dispatch({
            type: 'SELECT_NOTES',
            payload: { ids: [note.id], append: e.ctrlKey || e.shiftKey }
        });
    };

    // Background Click -> Seek
    const handleBgClick = (e: React.MouseEvent) => {
        if (playback.isPlaying) return;
        audio.seek(hoverTime);
    };

    return (
        <div className="flex-1 flex flex-col bg-background relative select-none">
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
                    {/* 1. Ruler (Top) */}
                    <div className="sticky top-0 z-20">
                        <TimelineRuler 
                            duration={playback.duration} 
                            bpm={mapData.bpm} 
                            zoom={settings.zoom} 
                            snapDivisor={settings.snapDivisor} 
                        />
                    </div>

                    {/* 2. Grid (Background) */}
                    <div className="absolute top-8 bottom-0 left-0 right-0">
                        <TimelineGrid 
                            duration={playback.duration}
                            bpm={mapData.bpm}
                            offset={mapData.offset}
                            settings={settings}
                        />
                    </div>

                    {/* 3. Row Indicators (Center lines) */}
                    {[ROW_TOP, 1, ROW_BOTTOM].map((rowIdx) => (
                        <div 
                            key={rowIdx}
                            className="absolute left-0 right-0 border-b border-white/5 pointer-events-none"
                            style={{ 
                                top: 32 + (rowIdx * ROW_HEIGHT) + (ROW_HEIGHT / 2), // Offset by Ruler (32px) + Half Row
                            }}
                        />
                    ))}

                    {/* 4. Notes Layer */}
                    <div className="absolute top-8 left-0 right-0 bottom-0 pointer-events-none">
                        {mapData.notes.map(note => (
                            <div
                                key={note.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: (note.time / 1000) * settings.zoom - (NOTE_SIZE / 2),
                                    top: (note.column * ROW_HEIGHT) + (ROW_HEIGHT / 2) - (NOTE_SIZE / 2)
                                }}
                                onMouseDown={(e) => handleNoteClick(e, note)}
                            >
                                <HitCircle 
                                    char={note.key} 
                                    row={note.column} 
                                    selected={note.selected}
                                    type={note.type}
                                    duration={note.duration}
                                    zoom={settings.zoom}
                                />
                            </div>
                        ))}
                    </div>

                    {/* 5. Ghost Cursor (Snapping Visualizer) */}
                    {!playback.isPlaying && (
                        <div 
                            className="absolute top-8 bottom-0 w-0.5 bg-white/20 pointer-events-none z-30"
                            style={{ left: (hoverTime / 1000) * settings.zoom }}
                        />
                    )}

                    {/* 6. Playhead (Master Time) */}
                    <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-warning z-40 pointer-events-none shadow-[0_0_15px_rgba(251,191,36,0.8)]"
                        style={{ left: (playback.currentTime / 1000) * settings.zoom }}
                    >
                        {/* Triangle Head */}
                        <div className="absolute top-0 -left-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-warning" />
                    </div>
                </div>
            </div>
        </div>
    );
};