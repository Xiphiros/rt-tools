import { useState, useEffect } from 'react';
import { EditorProvider, useEditor } from './store/EditorContext';
import { EditorTimeline } from './components/EditorTimeline';
import { Playfield } from '../gameplay/components/Playfield';
import { MetadataModal } from './modals/MetadataModal';
import { TimingModal } from './modals/TimingModal';
import { useShortcuts } from './hooks/useShortcuts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlay, faPause, faUndo, faRedo, faFileUpload, faChevronLeft
} from '@fortawesome/free-solid-svg-icons';

// --- SUB-COMPONENTS ---

const TopMenuBar = ({ onOpenModal }: { onOpenModal: (modal: string) => void }) => {
    const { mapData } = useEditor();

    return (
        <div className="h-12 bg-black border-b border-white/10 flex items-center px-4 justify-between select-none z-50">
            {/* Left: Navigation */}
            <div className="flex items-center gap-6">
                <button className="text-sm font-bold text-muted hover:text-white transition-colors flex items-center gap-2">
                    <FontAwesomeIcon icon={faChevronLeft} />
                    <span>Exit</span>
                </button>
                
                <div className="h-4 w-[1px] bg-white/20" />

                <nav className="flex gap-1">
                    <button 
                        onClick={() => onOpenModal('metadata')}
                        className="px-4 py-1.5 rounded hover:bg-white/10 text-sm font-medium transition-colors text-muted hover:text-white"
                    >
                        Setup
                    </button>
                    <button 
                        onClick={() => onOpenModal('timing')}
                        className="px-4 py-1.5 rounded hover:bg-white/10 text-sm font-medium transition-colors text-muted hover:text-white"
                    >
                        Timing
                    </button>
                    <button className="px-4 py-1.5 rounded bg-primary/20 text-primary text-sm font-bold shadow-inner">
                        Compose
                    </button>
                    <button className="px-4 py-1.5 rounded hover:bg-white/10 text-sm font-medium transition-colors text-muted hover:text-white">
                        Design
                    </button>
                </nav>
            </div>

            {/* Center: Song Info */}
            <div className="absolute left-1/2 -translate-x-1/2 text-center opacity-80 pointer-events-none hidden md:block">
                <div className="text-sm font-bold text-white tracking-wide">
                    {mapData.metadata.artist || "Artist"} - {mapData.metadata.title || "Title"}
                </div>
                <div className="text-xs text-primary font-mono tracking-wider">
                    [{mapData.metadata.difficultyName || "Difficulty"}]
                </div>
            </div>

            {/* Right: Export/Actions */}
            <div className="flex items-center gap-4">
                <button className="text-sm text-secondary hover:text-white transition-colors flex items-center gap-2">
                    <FontAwesomeIcon icon={faFileUpload} />
                    <span>Export</span>
                </button>
            </div>
        </div>
    );
};

const EditorBottomBar = () => {
    const { playback, audio, canUndo, canRedo, dispatch, settings, setSettings } = useEditor();

    const togglePlay = () => {
        if (playback.isPlaying) audio.pause();
        else audio.play();
    };

    return (
        <div className="h-16 bg-card border-t border-border flex items-center px-4 justify-between select-none shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-50">
            {/* Playback Controls */}
            <div className="flex items-center gap-3">
                <button 
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full bg-primary hover:bg-primary-hover text-black flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-primary/20"
                    title="Play/Pause (Space)"
                >
                    <FontAwesomeIcon icon={playback.isPlaying ? faPause : faPlay} size="lg" />
                </button>
                
                <div className="flex flex-col ml-2">
                    <span className="text-xs text-muted uppercase font-bold tracking-wider">Time</span>
                    <span className="text-xl font-mono font-medium text-white">
                        {(playback.currentTime / 1000).toFixed(3)}
                    </span>
                </div>
            </div>

            {/* Snapping / Tool Settings */}
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-muted uppercase font-bold mb-1">Beat Snap</span>
                    <div className="flex items-center bg-input rounded-full px-1 py-0.5 border border-border">
                        <select 
                            className="bg-transparent border-none text-sm font-bold text-center w-16 focus:outline-none cursor-pointer text-white"
                            value={settings.snapDivisor}
                            onChange={(e) => setSettings(s => ({ ...s, snapDivisor: Number(e.target.value) }))}
                        >
                            {[1, 2, 3, 4, 6, 8, 12, 16].map(v => (
                                <option key={v} value={v}>1/{v}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-muted uppercase font-bold mb-1">Playback Rate</span>
                    <div className="flex gap-1">
                        {[0.5, 0.75, 1.0].map(rate => (
                            <button
                                key={rate}
                                onClick={() => setSettings(s => ({ ...s, playbackSpeed: rate }))}
                                className={`px-2 py-0.5 text-xs rounded font-bold transition-colors ${
                                    settings.playbackSpeed === rate 
                                    ? 'bg-secondary text-black' 
                                    : 'bg-input text-muted hover:text-white'
                                }`}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Undo/Redo */}
            <div className="flex gap-2">
                <button 
                    disabled={!canUndo} 
                    onClick={() => dispatch({ type: 'UNDO' })}
                    className="w-10 h-10 rounded hover:bg-white/10 flex items-center justify-center text-muted hover:text-white disabled:opacity-30 transition-colors"
                    title="Undo (Ctrl+Z)"
                >
                    <FontAwesomeIcon icon={faUndo} />
                </button>
                <button 
                    disabled={!canRedo} 
                    onClick={() => dispatch({ type: 'REDO' })}
                    className="w-10 h-10 rounded hover:bg-white/10 flex items-center justify-center text-muted hover:text-white disabled:opacity-30 transition-colors"
                    title="Redo (Ctrl+Y)"
                >
                    <FontAwesomeIcon icon={faRedo} />
                </button>
            </div>
        </div>
    );
};

// --- MAIN LAYOUT ---

const EditorLayout = () => {
    const { mapData, playback, audio } = useEditor();
    const [activeModal, setActiveModal] = useState<string | null>(null);

    // Initialize Shortcuts Hook
    useShortcuts();

    // Initial load logic placeholder
    useEffect(() => {
        // audio.load('path/to/audio.mp3');
    }, [audio]);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#121212] text-text-primary overflow-hidden font-sans">
            <TopMenuBar onOpenModal={setActiveModal} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative min-h-0">
                
                {/* 1. Playfield (Game View) - Takes remaining space */}
                <div className="flex-1 relative bg-black/50 overflow-hidden shadow-inner">
                    {/* Background Image Layer */}
                    {mapData.metadata.backgroundFile && (
                        <div 
                            className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm pointer-events-none"
                            style={{ backgroundImage: `url(${mapData.metadata.backgroundFile})` }}
                        />
                    )}
                    
                    {/* The Actual Playfield */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="aspect-video w-full max-h-full relative">
                            <Playfield 
                                mapData={mapData} 
                                currentTime={playback.currentTime} 
                                playbackRate={playback.playbackRate} 
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Timeline - Bottom section, fixed height */}
                <div className="h-48 border-t border-border bg-card/95 backdrop-blur shadow-2xl relative z-10">
                    <EditorTimeline />
                </div>
            </div>

            <EditorBottomBar />

            {/* Modals */}
            <MetadataModal isOpen={activeModal === 'metadata'} onClose={() => setActiveModal(null)} />
            <TimingModal isOpen={activeModal === 'timing'} onClose={() => setActiveModal(null)} />
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