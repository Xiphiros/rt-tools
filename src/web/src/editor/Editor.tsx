import React, { useEffect } from 'react';
import { EditorProvider, useEditor } from './store/EditorContext';
import { EditorTimeline } from './components/EditorTimeline';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlay, faPause, faUndo, faRedo, faSave, faCog, faMinus, faPlus
} from '@fortawesome/free-solid-svg-icons';

const EditorToolbar = () => {
    const { playback, audio, canUndo, canRedo, dispatch, settings, setSettings } = useEditor();

    const togglePlay = () => {
        if (playback.isPlaying) audio.pause();
        else audio.play();
    };

    return (
        <div className="h-14 bg-card border-b border-border flex items-center px-4 justify-between select-none shadow-lg z-50 relative">
            {/* Left: Playback Controls */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-lg bg-primary hover:bg-primary-hover text-black flex items-center justify-center transition-colors shadow-lg shadow-cyan-500/20 active:scale-95"
                >
                    <FontAwesomeIcon icon={playback.isPlaying ? faPause : faPlay} />
                </button>
                
                <div className="bg-input rounded px-3 py-1 text-mono text-sm border border-border w-24 text-center font-bold text-primary">
                    {(playback.currentTime / 1000).toFixed(3)}s
                </div>

                <div className="flex gap-1 ml-4 border-l border-border pl-4">
                    <button 
                        disabled={!canUndo}
                        onClick={() => dispatch({ type: 'UNDO' })}
                        className="p-2 text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                        title="Undo (Ctrl+Z)"
                    >
                        <FontAwesomeIcon icon={faUndo} />
                    </button>
                    <button 
                        disabled={!canRedo}
                        onClick={() => dispatch({ type: 'REDO' })}
                        className="p-2 text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                        title="Redo (Ctrl+Y)"
                    >
                        <FontAwesomeIcon icon={faRedo} />
                    </button>
                </div>
            </div>

            {/* Center: Settings */}
            <div className="flex items-center gap-6">
                {/* Snapping */}
                <div className="flex items-center gap-2 text-sm text-muted bg-input/50 px-2 py-1 rounded border border-border/50">
                    <span className="font-semibold text-xs uppercase tracking-wider">Snap</span>
                    <select 
                        className="bg-transparent border-none text-text-primary font-bold focus:outline-none cursor-pointer"
                        value={settings.snapDivisor}
                        onChange={(e) => setSettings(s => ({ ...s, snapDivisor: Number(e.target.value) }))}
                    >
                        <option value="1">1/1</option>
                        <option value="2">1/2</option>
                        <option value="3">1/3</option>
                        <option value="4">1/4</option>
                        <option value="6">1/6</option>
                        <option value="8">1/8</option>
                        <option value="12">1/12</option>
                        <option value="16">1/16</option>
                    </select>
                </div>
                
                {/* Zoom Control */}
                <div className="flex items-center gap-2 text-sm text-muted">
                    <button 
                        onClick={() => setSettings(s => ({...s, zoom: Math.max(50, s.zoom - 25)}))}
                        className="hover:text-white"
                    >
                        <FontAwesomeIcon icon={faMinus} size="sm" />
                    </button>
                    <span className="w-12 text-center text-xs">{settings.zoom}%</span>
                    <button 
                        onClick={() => setSettings(s => ({...s, zoom: Math.min(500, s.zoom + 25)}))}
                        className="hover:text-white"
                    >
                        <FontAwesomeIcon icon={faPlus} size="sm" />
                    </button>
                </div>
            </div>

            {/* Right: Meta Actions */}
            <div className="flex items-center gap-2">
                <button className="px-4 py-1.5 rounded-md bg-secondary/10 border border-secondary/30 text-secondary hover:bg-secondary/20 text-sm font-bold transition-all flex items-center gap-2">
                    <FontAwesomeIcon icon={faSave} />
                    <span>Save .RTM</span>
                </button>
            </div>
        </div>
    );
};

const EditorLayout = () => {
    const { audio } = useEditor();
    
    // Simulate loading for dev
    useEffect(() => {
        // audio.load('path/to/test.mp3'); 
    }, [audio]);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0a0a0a]">
            <EditorToolbar />
            
            {/* Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Main Timeline */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Info Bar (Optional) */}
                    <div className="h-8 bg-card/50 border-b border-border flex items-center px-4 text-xs text-muted">
                        <span>Press <b>Q-P</b> (Row 1), <b>A-;</b> (Row 2), <b>Z-/</b> (Row 3) to place notes. Hold <b>Shift</b> for long notes.</span>
                    </div>
                    
                    <EditorTimeline />
                </div>
                
                {/* Right Sidebar: Properties & Metadata (Collapsible in future) */}
                <div className="w-72 bg-card border-l border-border p-0 flex flex-col shadow-xl z-40">
                    <div className="p-4 border-b border-border bg-input/20">
                        <h3 className="text-xs uppercase font-bold text-muted tracking-widest flex items-center gap-2">
                            <FontAwesomeIcon icon={faCog} /> Properties
                        </h3>
                    </div>
                    <div className="p-6 text-center text-muted/40 text-sm italic flex-1 flex items-center justify-center">
                        No object selected
                    </div>
                </div>
            </div>
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