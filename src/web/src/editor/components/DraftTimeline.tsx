import React, { useRef, useMemo, useState } from 'react';
import { useEditor } from '../store/EditorContext';
import { getVisibleNotes } from '../utils/binarySearch';
import { EditorNote } from '../types';
import { getActiveTimingPoint } from '../utils/timing';
import { getSnapDivisor, getSnapColor } from '../utils/snapColors';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileImport, faGripVertical, faChevronUp, faChevronDown, faTrash } from '@fortawesome/free-solid-svg-icons';

interface DraftTimelineProps {
    height?: number;
}

export const DraftTimeline = ({ height = 100 }: DraftTimelineProps) => {
    const { mapData, playback, settings, dispatch } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Collapsible State (Default: Collapsed)
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter to show upcoming notes based on playhead
    const START_OFFSET = -1000;
    const END_OFFSET = 4000;

    const visibleDraftNotes = useMemo(() => {
        // Optimization: Only calc if expanded or just to show count
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
            const notesArray = json.notes || [];
            
            const drafts: EditorNote[] = notesArray.map((n: any) => ({
                id: crypto.randomUUID(),
                time: n.time || n.startTime || 0,
                key: n.key || '',
                column: 0,
                type: n.type || 'tap',
                duration: (n.endTime || n.time) - (n.time || n.startTime),
                layerId: 'draft',
                hitsound: n.hitsound || { sampleSet: 'normal', volume: 100, additions: { whistle: false, finish: false, clap: false } }
            }));

            dispatch({ type: 'LOAD_DRAFT_NOTES', payload: drafts });
            setIsExpanded(true); // Auto-expand on import
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
        e.dataTransfer.setData('application/json', JSON.stringify(note));
        e.dataTransfer.effectAllowed = 'move';
    };

    // Calculate snap color for a note
    const getNoteColor = (time: number) => {
        const tp = getActiveTimingPoint(time, mapData.timingPoints);
        if (!tp) return '#fff';
        const msPerBeat = 60000 / tp.bpm;
        const offset = tp.time;
        const beatIndex = (time - offset) / msPerBeat;
        const snap = getSnapDivisor(beatIndex);
        return snap > 0 ? getSnapColor(snap) : '#fff';
    };

    const draftCount = (mapData.draftNotes || []).length;

    if (draftCount === 0) {
        if (!isExpanded) {
            // Minimal Empty Bar
             return (
                <div className="h-8 bg-[#0a0a0a] border-b border-white/10 flex items-center justify-between px-3 select-none">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase">
                        <FontAwesomeIcon icon={faGripVertical} /> Reference / Draft
                    </div>
                     <label className="cursor-pointer text-[10px] text-primary hover:text-white transition-colors font-bold flex items-center gap-2 bg-white/5 px-2 py-1 rounded">
                        <FontAwesomeIcon icon={faFileImport} /> IMPORT JSON
                        <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                    </label>
                </div>
            );
        }
    }

    return (
        <div 
            className="bg-[#0a0a0a] border-b border-white/10 relative overflow-hidden select-none flex flex-col transition-all duration-300 ease-in-out"
            style={{ height: isExpanded ? height : 32 }} // 32px = Header Height
            ref={containerRef}
        >
            {/* Header */}
            <div className="h-8 bg-white/5 flex justify-between items-center px-3 border-b border-white/5 z-20 relative">
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-[10px] font-bold text-muted hover:text-white uppercase tracking-widest transition-colors focus:outline-none"
                >
                    <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} /> 
                    Reference {draftCount > 0 && <span className="bg-white/10 px-1.5 rounded-full text-white">{draftCount}</span>}
                </button>
                
                <div className="flex gap-3">
                    <label className="cursor-pointer text-[10px] text-primary hover:text-white transition-colors font-bold">
                        IMPORT
                        <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                    </label>
                    {draftCount > 0 && (
                        <button onClick={handleClear} className="text-[10px] text-danger hover:text-white transition-colors font-bold">
                            <FontAwesomeIcon icon={faTrash} />
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline Strip (Only visible if expanded) */}
            <div className={`flex-1 relative transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Center Line (Playhead) */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-yellow-400/50 z-10" />

                {visibleDraftNotes.map(note => {
                    const relativeTime = note.time - playback.currentTime;
                    const pxOffset = (relativeTime / 1000) * settings.zoom; 
                    const left = `calc(50% + ${pxOffset}px)`;
                    const width = Math.max(20, (note.duration || 0) / 1000 * settings.zoom);
                    const color = getNoteColor(note.time);

                    return (
                        <div
                            key={note.id}
                            className="absolute top-1/2 -translate-y-1/2 h-10 rounded border flex items-center justify-center cursor-grab active:cursor-grabbing hover:brightness-125 transition-all group"
                            style={{ 
                                left, 
                                width: note.type === 'hold' ? width : 30,
                                marginLeft: note.type === 'hold' ? 0 : -15,
                                backgroundColor: `${color}20`, // Low opacity fill
                                borderColor: color
                            }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, note)}
                        >
                            <span className="text-xs font-bold text-white/70 group-hover:text-white pointer-events-none drop-shadow-md">
                                {note.key.toUpperCase()}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};