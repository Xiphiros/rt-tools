import { useState } from 'react';
import { EditorProvider, useEditor } from './store/EditorContext';
import { EditorTimeline } from './components/EditorTimeline';
import { EditorToolbox } from './components/EditorToolbox';
import { Playfield } from '../gameplay/components/Playfield';
import { MetadataModal } from './modals/MetadataModal';
import { TimingModal } from './modals/TimingModal';
import { ResnapModal } from './modals/ResnapModal';
import { ProjectManagerModal } from './modals/ProjectManagerModal';
import { useShortcuts } from './hooks/useShortcuts';
import { useMetronome } from './hooks/useMetronome';
import { exportBeatmapPackage } from './utils/exporter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlay, faPause, faUndo, faRedo, faFileUpload, faChevronLeft, faVolumeUp, faVolumeMute, faAngleDown, faFolder
} from '@fortawesome/free-solid-svg-icons';

const TopMenuBar = ({ onOpenModal }: { onOpenModal: (modal: string) => void }) => {
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
                    <button className="px-4 py-1.5 rounded bg-primary/20 text-primary text-sm font-bold shadow-inner">Compose</button>
                    <button className="px-4 py-1.5 rounded hover:bg-white/10 text-sm font-medium transition-colors text-muted hover:text-white">Design</button>
                </nav>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 text-center opacity-80 pointer-events-none hidden md:block">
                <div className="text-sm font-bold text-white tracking-wide">
                    {mapData.metadata.artist || "Artist"} - {mapData.metadata.title || "Title"}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => exportBeatmapPackage(mapData, activeProjectId || undefined)} 
                    className="text-sm text-secondary hover:text-white transition-colors flex items-center gap-2"
                >
                    <FontAwesomeIcon icon={faFileUpload} />
                    <span>Export</span>
                </button>
            </div>
        </div>
    );
};

const EditorBottomBar = () => {
    const { playback, audio, canUndo, canRedo, dispatch, settings, setSettings } = useEditor();
    const togglePlay = () => { playback.isPlaying ? audio.pause() : audio.play(); };

    return (
        <div className="h-16 bg-card border-t border-border flex items-center px-4 justify-between select-none shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-50">
            <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-primary hover:bg-primary-hover text-black flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-primary/20">
                    <FontAwesomeIcon icon={playback.isPlaying ? faPause : faPlay} size="lg" />
                </button>
                <div className="flex flex-col ml-2">
                    <span className="text-xs text-muted uppercase font-bold tracking-wider">Time</span>
                    <span className="text-xl font-mono font-medium text-white">{(playback.currentTime / 1000).toFixed(3)}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-muted uppercase font-bold mb-1 tracking-wider">Beat Snap</span>
                    <div className="relative group">
                        <select 
                            className="appearance-none bg-input border border-border hover:border-primary/50 text-white font-bold text-center pl-4 pr-8 py-1.5 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer shadow-sm w-24"
                            value={settings.snapDivisor} 
                            onChange={(e) => setSettings(s => ({ ...s, snapDivisor: Number(e.target.value) }))}
                        >
                            {[1, 2, 3, 4, 6, 8, 12, 16].map(v => (<option key={v} value={v}>1/{v}</option>))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted group-hover:text-primary transition-colors">
                            <FontAwesomeIcon icon={faAngleDown} size="sm" />
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-muted uppercase font-bold mb-1 tracking-wider">Metronome</span>
                    <button 
                        onClick={() => setSettings(s => ({ ...s, metronome: !s.metronome }))}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all border ${settings.metronome ? 'bg-primary text-black border-primary shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'bg-input text-muted border-border hover:text-white hover:border-white/20'}`}
                    >
                        <FontAwesomeIcon icon={settings.metronome ? faVolumeUp : faVolumeMute} />
                    </button>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-muted uppercase font-bold mb-1 tracking-wider">Playback Rate</span>
                    <div className="flex gap-1 bg-input p-1 rounded-lg border border-border">
                        {[0.5, 0.75, 1.0].map(rate => (
                            <button 
                                key={rate} 
                                onClick={() => setSettings(s => ({ ...s, playbackSpeed: rate }))} 
                                className={`px-2.5 py-1 text-xs rounded-md font-bold transition-all ${
                                    settings.playbackSpeed === rate 
                                    ? 'bg-secondary text-black shadow-sm' 
                                    : 'text-muted hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <button disabled={!canUndo} onClick={() => dispatch({ type: 'UNDO' })} className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted hover:text-white disabled:opacity-30 transition-colors"><FontAwesomeIcon icon={faUndo} /></button>
                <button disabled={!canRedo} onClick={() => dispatch({ type: 'REDO' })} className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted hover:text-white disabled:opacity-30 transition-colors"><FontAwesomeIcon icon={faRedo} /></button>
            </div>
        </div>
    );
};

const EditorLayout = () => {
    const { mapData, playback, bgBlobUrl, settings } = useEditor();
    const [activeModal, setActiveModal] = useState<string | null>(null);
    useShortcuts();
    useMetronome();

    const bottomPanelHeight = settings.showWaveform ? 'h-[240px]' : 'h-[160px]';

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#121212] text-text-primary overflow-hidden font-sans">
            <TopMenuBar onOpenModal={setActiveModal} />
            <div className="flex-1 flex flex-col relative min-h-0">
                <div className="flex-1 relative bg-black/50 overflow-hidden shadow-inner">
                    {bgBlobUrl && (
                        <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm pointer-events-none" style={{ backgroundImage: `url(${bgBlobUrl})` }} />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="aspect-video w-full max-h-full relative">
                            <Playfield mapData={mapData} currentTime={playback.currentTime} playbackRate={playback.playbackRate} scale={1.1} />
                        </div>
                    </div>
                    {/* Wired onOpenModal */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40">
                        <EditorToolbox onOpenModal={setActiveModal} />
                    </div>
                </div>
                
                <div className={`${bottomPanelHeight} transition-all duration-300 ease-in-out border-t border-border bg-card/95 backdrop-blur shadow-2xl relative z-10`}>
                    <EditorTimeline />
                </div>
            </div>
            <EditorBottomBar />
            
            {/* Modals */}
            <MetadataModal isOpen={activeModal === 'metadata'} onClose={() => setActiveModal(null)} />
            <TimingModal isOpen={activeModal === 'timing'} onClose={() => setActiveModal(null)} />
            <ResnapModal isOpen={activeModal === 'resnap'} onClose={() => setActiveModal(null)} />
            <ProjectManagerModal isOpen={activeModal === 'projects'} onClose={() => setActiveModal(null)} />
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