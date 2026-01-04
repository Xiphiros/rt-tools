import React, { useRef, useEffect } from 'react';
import { useEditor } from '../store/EditorContext';
import { TimelineGrid } from './TimelineGrid';
import { NoteObject } from './NoteObject';
import { EditorNote } from '../types';

export const Timeline = () => {
    const { mapData, settings, playback, dispatch, audio } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);

    // Constants
    const ROW_HEIGHT = 60;
    const ROW_COUNT = 4; // Assuming 4 rows for simplicity in this version

    // Auto-scroll logic when playing
    useEffect(() => {
        if (playback.isPlaying && containerRef.current) {
            const scrollPos = (playback.currentTime / 1000) * settings.zoom - (containerRef.current.clientWidth / 2);
            containerRef.current.scrollLeft = scrollPos;
        }
    }, [playback.currentTime, playback.isPlaying, settings.zoom]);

    // Handlers
    const handleTimelineClick = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        
        // 1. Calculate Time from click position
        const rect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft;
        
        const rawTime = (clickX / settings.zoom) * 1000;
        
        // 2. Snap Logic
        const msPerBeat = 60000 / mapData.bpm;
        const snapInterval = msPerBeat / settings.snapDivisor;
        const snappedTime = Math.round(rawTime / snapInterval) * snapInterval;

        // 3. Row Logic
        const clickY = e.clientY - rect.top;
        const row = Math.floor(clickY / ROW_HEIGHT);

        if (row >= 0 && row < ROW_COUNT) {
            // Determine Key char based on row (QWERTY default)
            const keys = ['q', 'w', 'e', 'r']; // Simplified mapping
            const key = keys[row] || '?';

            // Seek audio to this point (Preview)
            audio.seek(snappedTime);

            // Add Note
            dispatch({
                type: 'ADD_NOTE',
                payload: {
                    id: crypto.randomUUID(),
                    time: snappedTime,
                    column: row,
                    key: key,
                    type: 'tap' // Default to tap
                }
            });
        }
    };

    const handleNoteClick = (e: React.MouseEvent, note: EditorNote) => {
        // Selection logic
        dispatch({
            type: 'SELECT_NOTES',
            payload: { ids: [note.id], append: e.ctrlKey || e.shiftKey }
        });
    };

    const handleNoteRightClick = (e: React.MouseEvent, note: EditorNote) => {
        dispatch({ type: 'REMOVE_NOTES', payload: [note.id] });
    };

    return (
        <div className="flex-1 relative overflow-hidden bg-background border-t border-border flex flex-col">
            {/* Track Info / Header Row could go here */}
            
            {/* Scrollable Area */}
            <div 
                ref={containerRef}
                className="flex-1 overflow-x-auto relative custom-scrollbar select-none"
                onClick={handleTimelineClick}
            >
                {/* Fixed Height Container based on rows */}
                <div 
                    className="relative"
                    style={{ height: ROW_HEIGHT * ROW_COUNT, minWidth: '100%' }}
                >
                    {/* 1. Grid */}
                    <TimelineGrid 
                        duration={playback.duration || 180000} // Default 3min if loading
                        bpm={mapData.bpm} 
                        offset={mapData.offset}
                        settings={settings}
                    />

                    {/* 2. Row Backgrounds (Visual guide) */}
                    {Array.from({ length: ROW_COUNT }).map((_, i) => (
                        <div 
                            key={i} 
                            className="absolute left-0 right-0 border-b border-border/10 pointer-events-none"
                            style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT, width: (playback.duration / 1000) * settings.zoom }}
                        />
                    ))}

                    {/* 3. Notes */}
                    {mapData.notes.map(note => (
                        <NoteObject 
                            key={note.id} 
                            note={note} 
                            zoom={settings.zoom}
                            rowHeight={ROW_HEIGHT}
                            onClick={handleNoteClick}
                            onContextMenu={handleNoteRightClick}
                        />
                    ))}

                    {/* 4. Playhead Cursor */}
                    <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-warning z-50 pointer-events-none shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                        style={{ left: (playback.currentTime / 1000) * settings.zoom }}
                    >
                        <div className="absolute -top-1 -left-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-warning" />
                    </div>
                </div>
            </div>
        </div>
    );
};