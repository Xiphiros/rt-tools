import React, { useEffect } from 'react';
import { EditorProvider, useEditor } from './store/EditorContext';
import { Timeline } from './components/Timeline';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlay, faPause, faUndo, faRedo, faSave, faCog, faMusic
} from '@fortawesome/free-solid-svg-icons';

const EditorToolbar = () => {
    const { playback, audio, canUndo, canRedo, dispatch, settings, setSettings } = useEditor();

    const togglePlay = () => {
        if (playback.isPlaying) audio.pause();
        else audio.play();
    };

    return (
        <div className="h-14 bg-card border-b border-border flex items-center px-4 justify-between select-none">
            {/* Left: Playback Controls */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-lg bg-primary hover:bg-primary-hover text-black flex items-center justify-center transition-colors"
                >
                    <FontAwesomeIcon icon={playback.isPlaying ? faPause : faPlay} />
                </button>
                
                <div className="bg-input rounded px-3 py-1 text-mono text-sm border border-border">
                    {(playback.currentTime / 1000).toFixed(3)}s
                </div>

                <div className="flex gap-1 ml-4 border-l border-border pl-4">
                    <button 
                        disabled={!canUndo}
                        onClick={() => dispatch({ type: 'UNDO' })}
                        className="p-2 text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                    >
                        <FontAwesomeIcon icon={faUndo} />
                    </button>
                    <button 
                        disabled={!canRedo}
                        onClick={() => dispatch({ type: 'REDO' })}
                        className="p-2 text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                    >
                        <FontAwesomeIcon icon={faRedo} />
                    </button>
                </div>
            </div>

            {/* Center: Settings */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted">
                    <span>Snap: 1/</span>
                    <select 
                        className="bg-input border border-border rounded px-1 py-0.5 focus:outline-none focus:border-primary"
                        value={settings.snapDivisor}
                        onChange={(e) => setSettings(s => ({ ...s, snapDivisor: Number(e.target.value) }))}
                    >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="4">4</option>
                        <option value="8">8</option>
                        <option value="16">16</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted">
                    <span>Zoom:</span>
                    <input 
                        type="range" 
                        min="50" max="300" 
                        value={settings.zoom}
                        onChange={(e) => setSettings(s => ({ ...s, zoom: Number(e.target.value) }))}
                        className="w-24 accent-primary"
                    />
                </div>
            </div>

            {/* Right: Meta Actions */}
            <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-md bg-input border border-border hover:bg-white/5 text-sm font-medium transition-colors flex items-center gap-2">
                    <FontAwesomeIcon icon={faSave} />
                    <span>Export</span>
                </button>
            </div>
        </div>
    );
};

const EditorLayout = () => {
    // Load a dummy song on mount for testing
    const { audio } = useEditor();
    
    useEffect(() => {
        // In a real app, this would come from the loaded map data
        // For now, we simulate a load or wait for user drag/drop
        // audio.load('path/to/song.mp3');
    }, []);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            <EditorToolbar />
            <div className="flex-1 flex overflow-hidden">
                {/* Timeline Area */}
                <Timeline />
                
                {/* Right Sidebar (Properties) - Placeholder */}
                <div className="w-64 bg-card border-l border-border p-4 hidden lg:block">
                    <h3 className="text-xs uppercase font-bold text-muted mb-4 tracking-wider">Properties</h3>
                    <div className="p-4 rounded-lg border border-border/50 bg-input/20 text-center text-muted text-sm">
                        Select a note to view properties
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Export wrapping with Provider
export const Editor = () => {
    return (
        <EditorProvider>
            <EditorLayout />
        </EditorProvider>
    );
};