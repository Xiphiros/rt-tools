import { useState, useEffect, useRef } from 'react';
import { EditorProvider, useEditor } from './store/EditorContext';
import { EditorTimeline } from './components/EditorTimeline';
import { EditorToolbox } from './components/EditorToolbox';
import { EditorBottomBar } from './components/EditorBottomBar';
import { EditorRightBar } from './components/EditorRightBar';
import { Playfield } from '../gameplay/components/Playfield';
import { DraftTimeline } from './components/DraftTimeline'; 
import { MetadataModal } from './modals/MetadataModal';
import { TimingModal } from './modals/TimingModal';
import { ResnapModal } from './modals/ResnapModal';
import { ProjectManagerModal } from './modals/ProjectManagerModal';
import { DifficultyManagerModal } from './modals/DifficultyManagerModal';
import { LayerColorModal } from './modals/LayerColorModal';
import { HitsoundPanel } from './components/HitsoundPanel';
import { useShortcuts } from './hooks/useShortcuts';
import { useMetronome } from './hooks/useMetronome';
import { usePlaybackHitsounds } from './hooks/usePlaybackHitsounds';
import { useLiveInput } from './hooks/useLiveInput';
import { exportBeatmapPackage } from './utils/exporter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faFileUpload, faChevronLeft, faFolder, faColumns, faLayerGroup
} from '@fortawesome/free-solid-svg-icons';
import { EditorNote } from './types';
import { snapTime } from './utils/timing';
import { getNoteCoordinates } from '../gameplay/utils/playfieldCoordinates';

const TopMenuBar = ({ onOpenModal, showSidebar, toggleSidebar }: { onOpenModal: (modal: string) => void, showSidebar: boolean, toggleSidebar: () => void }) => {
    const { mapData, activeProjectId } = useEditor();
    return (
        <div className="h-12 bg-black border-b border-white/10 flex items-center px-4 justify-between select-none z-50">
            <div className="flex items-center gap-6">
                <button className="text-sm font-bold text-muted hover:text-white transition-colors flex items-center gap-2">
                    <FontAwesomeIcon icon={faChevronLeft} />
                    <span>Exit</span>
                </button>
                <div className="h-4 w-[1px] bg-white/20" />
                <nav className="flex gap-1">
                    <button onClick={() => onOpenModal('projects')} className="px-4 py-1.5 rounded hover:bg-white/10 text-sm font-medium transition-colors text-white flex items-center gap-2">
                        <FontAwesomeIcon icon={faFolder} /> Projects
                    </button>
                    <div className="w-[1px] h-4 bg-white/10 mx-2" />
                    <button onClick={() => onOpenModal('metadata')} className="px-4 py-1.5 rounded hover:bg-white/10 text-sm font-medium transition-colors text-muted hover:text-white">Setup</button>
                    <button onClick={() => onOpenModal('timing')} className="px-4 py-1.5 rounded hover:bg-white/10 text-sm font-medium transition-colors text-muted hover:text-white">Timing</button>
                    <button onClick={() => onOpenModal('difficulties')} className="px-4 py-1.5 rounded hover:bg-white/10 text-sm font-medium transition-colors text-muted hover:text-white flex items-center gap-2">
                        <FontAwesomeIcon icon={faLayerGroup} />
                        {mapData.metadata.difficultyName || "Difficulty"}
                    </button>
                </nav>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => exportBeatmapPackage(mapData, activeProjectId || undefined)} 
                    className="text-sm text-secondary hover:text-white transition-colors flex items-center gap-2"
                >
                    <FontAwesomeIcon icon={faFileUpload} />
                    <span>Export</span>
                </button>
                <div className="h-4 w-[1px] bg-white/20" />
                <button 
                    onClick={toggleSidebar}
                    className={`text-sm transition-colors flex items-center gap-2 ${showSidebar ? 'text-primary' : 'text-muted hover:text-white'}`}
                    title="Toggle Layers Panel"
                >
                    <FontAwesomeIcon icon={faColumns} />
                </button>
            </div>
        </div>
    );
};

const EditorLayout = () => {
    const { mapData, playback, bgBlobUrl, settings, dispatch, activeLayerId } = useEditor();
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const [layerColorId, setLayerColorId] = useState<string | null>(null);
    
    // Panel Visibility State
    const [showHitsoundPanel, setShowHitsoundPanel] = useState(false);
    const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);

    // Track selection changes to auto-open panel
    const prevSelectionCount = useRef(0);
    const selectionCount = mapData.notes.filter(n => n.selected).length;

    useEffect(() => {
        if (prevSelectionCount.current === 0 && selectionCount > 0) {
            setShowHitsoundPanel(true);
        }
        if (selectionCount === 0) {
            setShowHitsoundPanel(false);
        }
        prevSelectionCount.current = selectionCount;
    }, [selectionCount]);

    useShortcuts();
    useMetronome();
    usePlaybackHitsounds();
    useLiveInput();
    
    const bottomPanelHeight = settings.showWaveform ? 'h-[240px]' : 'h-[160px]';

    const handlePlayfieldNoteClick = (e: React.MouseEvent, note: EditorNote) => {
        const append = e.ctrlKey || e.shiftKey;
        dispatch({
            type: 'SELECT_NOTES',
            payload: { ids: [note.id], append }
        });
    };

    const handlePlayfieldBgClick = (e: React.MouseEvent) => {
        if (e.button === 0) {
            dispatch({ type: 'DESELECT_ALL' });
        }
    };

    // --- DRAG AND DROP HANDLERS (Draft -> Playfield) ---

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
        
        // --- HIT TEST LOGIC ---
        // 1. Get container dimensions
        const rect = e.currentTarget.getBoundingClientRect();
        const mxPct = ((e.clientX - rect.left) / rect.width) * 100;
        const myPct = ((e.clientY - rect.top) / rect.height) * 100;

        // 2. Scan visible notes for proximity
        // Using same filtering logic as Playfield for efficiency would be ideal, 
        // but finding "all" notes near current time is fast enough.
        const PREEMPT = settings.approachRate * 1000;
        const HIT_RADIUS = 5; // % distance tolerance (approx 5% of screen width)

        let closestId: string | null = null;
        let minDist = HIT_RADIUS;

        // Optimization: Filter by time first
        const candidates = mapData.notes.filter(n => Math.abs(n.time - playback.currentTime) < PREEMPT);

        for (const note of candidates) {
            const pos = getNoteCoordinates({
                row: note.column,
                key: note.key,
                rowOffsets: settings.rowOffsets,
                rowXOffsets: settings.rowXOffsets
            });

            const dist = Math.sqrt(Math.pow(pos.x - mxPct, 2) + Math.pow(pos.y - myPct, 2));
            if (dist < minDist) {
                minDist = dist;
                closestId = note.id;
            }
        }

        setHighlightedNoteId(closestId);
    };

    const handleDragLeave = () => {
        setHighlightedNoteId(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setHighlightedNoteId(null);

        try {
            const data = e.dataTransfer.getData('application/json');
            if (!data) return;
            const draftNote = JSON.parse(data) as EditorNote;
            
            // --- DETERMINE DROP TARGET ---
            let finalTime = draftNote.time;
            let finalColumn = 1;
            let finalKey = draftNote.key;

            // 1. Check for Snap Target (Existing Note)
            if (highlightedNoteId) {
                const target = mapData.notes.find(n => n.id === highlightedNoteId);
                if (target) {
                    finalTime = target.time;
                    finalColumn = target.column;
                    // We don't overwrite key usually, but if we want to "stack", 
                    // we keep the draft key so we can create a chord or variant.
                    // Or, if user intends to REPLACE, they might delete the old one manually.
                    // "Snap to note" implies taking its position (Time + Col).
                }
            } else {
                // 2. Standard Spatial Drop
                const rect = e.currentTarget.getBoundingClientRect();
                const yPct = (e.clientY - rect.top) / rect.height;
                
                if (yPct < 0.4) finalColumn = 0; // Top
                else if (yPct > 0.6) finalColumn = 2; // Bottom
                else finalColumn = 1; // Home

                if (settings.snappingEnabled) {
                    finalTime = snapTime(draftNote.time, mapData.timingPoints, settings.snapDivisor);
                }
            }

            const newNote: EditorNote = {
                ...draftNote,
                id: crypto.randomUUID(),
                column: finalColumn,
                layerId: activeLayerId,
                time: finalTime,
                key: finalKey
            };

            dispatch({ 
                type: 'COMMIT_DRAFT_NOTE', 
                payload: { draftId: draftNote.id, finalNote: newNote } 
            });

        } catch (err) {
            console.error("Drop failed", err);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#121212] text-text-primary overflow-hidden font-sans">
            <TopMenuBar onOpenModal={setActiveModal} showSidebar={showSidebar} toggleSidebar={() => setShowSidebar(!showSidebar)} />
            
            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative min-h-0 min-w-0">
                    
                    {/* DRAFT TIMELINE (Top) */}
                    <DraftTimeline height={100} />

                    <div className="flex-1 relative bg-black/50 overflow-hidden shadow-inner group/playfield">
                        {bgBlobUrl && (
                            <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm pointer-events-none" style={{ backgroundImage: `url(${bgBlobUrl})` }} />
                        )}
                        
                        {/* The Playfield (Drop Zone) */}
                        <div 
                            className="absolute inset-0 flex items-center justify-center"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="aspect-video w-full max-h-full relative">
                                <Playfield 
                                    mapData={mapData} 
                                    currentTime={playback.currentTime} 
                                    playbackRate={playback.playbackRate} 
                                    scale={1.1} 
                                    onNoteClick={handlePlayfieldNoteClick}
                                    onBackgroundClick={handlePlayfieldBgClick}
                                    activeLayerId={activeLayerId}
                                    dimInactiveLayers={settings.dimInactiveLayers}
                                    // Visual Props
                                    rowOffsets={settings.rowOffsets}
                                    rowXOffsets={settings.rowXOffsets}
                                    noteShape={settings.noteShape}
                                    approachStyle={settings.approachStyle}
                                    approachRate={settings.approachRate}
                                    highlightedNoteId={highlightedNoteId}
                                />
                                
                                {/* Floating Hitsound Panel */}
                                <HitsoundPanel 
                                    isOpen={showHitsoundPanel} 
                                    onClose={() => setShowHitsoundPanel(false)} 
                                />

                                {/* Drop Hints (Only if not targeting a specific note) */}
                                {!highlightedNoteId && (
                                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/playfield:opacity-100 transition-opacity flex flex-col">
                                        <div className="flex-1 border-b border-white/5 bg-sky-500/5 text-xs text-sky-200/20 p-2 font-mono">TOP ROW DROP ZONE</div>
                                        <div className="flex-1 border-b border-white/5 bg-purple-500/5 text-xs text-purple-200/20 p-2 font-mono">HOME ROW DROP ZONE</div>
                                        <div className="flex-1 bg-pink-500/5 text-xs text-pink-200/20 p-2 font-mono">BOTTOM ROW DROP ZONE</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Toolbox (Absolute to overlap playfield) */}
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40">
                            <EditorToolbox 
                                onOpenModal={setActiveModal} 
                                onToggleHitsounds={() => setShowHitsoundPanel(!showHitsoundPanel)}
                                isHitsoundsOpen={showHitsoundPanel}
                            />
                        </div>
                    </div>
                    
                    <div className={`${bottomPanelHeight} transition-all duration-300 ease-in-out border-t border-border bg-card/95 backdrop-blur shadow-2xl relative z-10`}>
                        <EditorTimeline />
                    </div>
                </div>

                {/* Right Sidebar */}
                {showSidebar && (
                    <EditorRightBar onEditColor={setLayerColorId} />
                )}
            </div>
            
            <EditorBottomBar />
            
            {/* Modals */}
            <MetadataModal isOpen={activeModal === 'metadata'} onClose={() => setActiveModal(null)} />
            <TimingModal isOpen={activeModal === 'timing'} onClose={() => setActiveModal(null)} />
            <ResnapModal isOpen={activeModal === 'resnap'} onClose={() => setActiveModal(null)} />
            <ProjectManagerModal isOpen={activeModal === 'projects'} onClose={() => setActiveModal(null)} />
            <DifficultyManagerModal isOpen={activeModal === 'difficulties'} onClose={() => setActiveModal(null)} />
            <LayerColorModal isOpen={!!layerColorId} layerId={layerColorId} onClose={() => setLayerColorId(null)} />
        </div>
    );
};

export const Editor = () => {
    return (
        <EditorProvider>
            <EditorLayout />
        </EditorProvider>
    );
};