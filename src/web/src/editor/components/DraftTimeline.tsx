import React, { useRef, useMemo } from 'react';
import { useEditor } from '../store/EditorContext';
import { getVisibleNotes } from '../utils/binarySearch';
import { EditorNote } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileImport, faGripVertical } from '@fortawesome/free-solid-svg-icons';

interface DraftTimelineProps {
    height?: number;
}

export const DraftTimeline = ({ height = 100 }: DraftTimelineProps) => {
    const { mapData, playback, settings, dispatch } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter to show upcoming notes based on playhead
    // Window: -1 second to +4 seconds relative to current time
    const START_OFFSET = -1000;
    const END_OFFSET = 4000;

    const visibleDraftNotes = useMemo(() => {
        return getVisibleNotes(
            mapData.draftNotes || [],
            playback.currentTime + START_OFFSET,
            playback.currentTime + END_OFFSET
        );
    }, [mapData.draftNotes, playback.currentTime]);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            
            // Handle different formats (RTM or raw 7K dump)
            const notesArray = json.notes || [];
            
            const drafts: EditorNote[] = notesArray.map((n: any) => ({
                id: crypto.randomUUID(),
                time: n.time || n.startTime || 0,
                key: n.key || '',
                column: 0, // Visual only
                type: n.type || 'tap',
                duration: (n.endTime || n.time) - (n.time || n.startTime),
                layerId: 'draft',
                hitsound: n.hitsound || { sampleSet: 'normal', volume: 100, additions: { whistle: false, finish: false, clap: false } }
            }));

            dispatch({ type: 'LOAD_DRAFT_NOTES', payload: drafts });
        } catch (err) {
            console.error("Failed to load draft:", err);
            alert("Invalid JSON format.");
        }
    };

    const handleClear = () => {
        if (confirm("Clear all draft notes?")) {
            dispatch({ type: 'LOAD_DRAFT_NOTES', payload: [] });
        }
    };

    const handleDragStart = (e: React.DragEvent, note: EditorNote) => {
        // We use standard HTML5 Drag & Drop for cross-component communication
        e.dataTransfer.setData('application/json', JSON.stringify(note));
        e.dataTransfer.effectAllowed = 'move';
    };

    if ((mapData.draftNotes || []).length === 0) {
        return (
            <div className="h-24 bg-black/40 border-b border-white/10 flex items-center justify-center relative">
                <label className="flex flex-col items-center gap-2 cursor-pointer text-muted hover:text-white transition-colors p-4 border-2 border-dashed border-white/10 rounded-lg hover:border-primary/50 hover:bg-white/5">
                    <FontAwesomeIcon icon={faFileImport} className="text-2xl" />
                    <span className="text-xs font-bold uppercase tracking-wider">Import Reference JSON</span>
                    <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                </label>
            </div>
        );
    }

    return (
        <div 
            className="bg-[#0a0a0a] border-b border-white/10 relative overflow-hidden select-none flex flex-col"
            style={{ height }}
            ref={containerRef}
        >
            {/* Header */}
            <div className="h-6 bg-white/5 flex justify-between items-center px-2 border-b border-white/5">
                <div className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                    <FontAwesomeIcon icon={faGripVertical} /> Draft / Incoming
                </div>
                <div className="flex gap-2">
                    <label className="cursor-pointer text-[10px] text-primary hover:text-white transition-colors font-bold">
                        IMPORT
                        <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                    </label>
                    <button onClick={handleClear} className="text-[10px] text-danger hover:text-white transition-colors font-bold">
                        CLEAR
                    </button>
                </div>
            </div>

            {/* Timeline Strip */}
            <div className="flex-1 relative">
                {/* Center Line (Playhead) */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-yellow-400/50 z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-yellow-400/80 text-black text-[9px] font-bold px-1 rounded-sm whitespace-nowrap z-[60]">
                        {(playback.currentTime / 1000).toFixed(3)}s
                    </div>
                </div>

                {visibleDraftNotes.map(note => {
                    const relativeTime = note.time - playback.currentTime;
                    const pxOffset = (relativeTime / 1000) * settings.zoom; 
                    const left = `calc(50% + ${pxOffset}px)`;
                    const width = Math.max(20, (note.duration || 0) / 1000 * settings.zoom);

                    return (
                        <div
                            key={note.id}
                            className="absolute top-1/2 -translate-y-1/2 h-10 rounded border border-white/20 bg-white/10 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-primary/20 hover:border-primary transition-colors group"
                            style={{ 
                                left, 
                                width: note.type === 'hold' ? width : 30,
                                marginLeft: note.type === 'hold' ? 0 : -15 // Center tap notes
                            }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, note)}
                        >
                            <span className="text-xs font-bold text-white/50 group-hover:text-white pointer-events-none">
                                {note.key.toUpperCase()}
                            </span>
                            
                            {/* Drag Handle Indicator */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[8px] text-primary whitespace-nowrap pointer-events-none transition-opacity">
                                Drag to Field
                            </div>
                        </div>
                    );
                })}
                
                {/* Empty State Hint */}
                {visibleDraftNotes.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center text-xs text-white/10 pointer-events-none">
                        No upcoming notes in window
                     </div>
                )}
            </div>
        </div>
    );
};