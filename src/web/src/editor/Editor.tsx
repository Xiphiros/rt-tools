import { useState, useEffect, useRef } from 'react';
import { EditorProvider, useEditor } from './store/EditorContext';
import { EditorTimeline } from './components/EditorTimeline';
import { EditorToolbox } from './components/EditorToolbox';
import { EditorBottomBar } from './components/EditorBottomBar';
import { EditorRightBar } from './components/EditorRightBar';
import { Playfield } from '../gameplay/components/Playfield';
import { DraftTimeline } from './components/DraftTimeline'; // Import DraftTimeline
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
import { KEY_TO_ROW } from '../gameplay/constants';
import { snapTime } from './utils/timing';

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
        e.preventDefault(); // Allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            const data = e.dataTransfer.getData('application/json');
            if (!data) return;
            const draftNote = JSON.parse(data) as EditorNote;
            
            // Calculate Drop Row
            // The Playfield renders centered. We need to approximate the row based on Y position.
            // Screen Height / 3 roughly? 
            // Better: Playfield has fixed logical size.
            
            const rect = e.currentTarget.getBoundingClientRect();
            const yPct = (e.clientY - rect.top) / rect.height;
            
            let row = 1; // Home default
            if (yPct < 0.4) row = 0; // Top
            else if (yPct > 0.6) row = 2; // Bottom

            // Commit Note
            // Snap the time if needed
            let finalTime = draftNote.time;
            if (settings.snappingEnabled) {
                finalTime = snapTime(draftNote.time, mapData.timingPoints, settings.snapDivisor);
            }

            const newNote: EditorNote = {
                ...draftNote,
                id: crypto.randomUUID(), // New ID for map note
                column: row,
                layerId: activeLayerId,
                time: finalTime,
                // If it was tapped, ensure it's still a tap unless duration exists
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
                                    noteShape={settings.noteShape}
                                    approachStyle={settings.approachStyle}
                                    approachRate={settings.approachRate}
                                />
                                
                                {/* Floating Hitsound Panel */}
                                <HitsoundPanel 
                                    isOpen={showHitsoundPanel} 
                                    onClose={() => setShowHitsoundPanel(false)} 
                                />

                                {/* Drop Hints */}
                                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/playfield:opacity-100 transition-opacity flex flex-col">
                                    <div className="flex-1 border-b border-white/5 bg-sky-500/5 text-xs text-sky-200/20 p-2 font-mono">TOP ROW DROP ZONE</div>
                                    <div className="flex-1 border-b border-white/5 bg-purple-500/5 text-xs text-purple-200/20 p-2 font-mono">HOME ROW DROP ZONE</div>
                                    <div className="flex-1 bg-pink-500/5 text-xs text-pink-200/20 p-2 font-mono">BOTTOM ROW DROP ZONE</div>
                                </div>
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