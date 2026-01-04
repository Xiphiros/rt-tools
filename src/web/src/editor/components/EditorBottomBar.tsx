import { useEditor } from '../store/EditorContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlay, faPause, faUndo, faRedo, faVolumeUp, faVolumeMute, faSpinner
} from '@fortawesome/free-solid-svg-icons';

export const EditorBottomBar = () => {
    const { playback, audio, canUndo, canRedo, dispatch, settings, setSettings } = useEditor();
    
    // Check if buffer is ready
    const isReady = !!audio.manager.getBuffer();

    const togglePlay = () => { 
        if (!isReady) return;
        playback.isPlaying ? audio.pause() : audio.play(); 
    };

    return (
        <div className="h-16 bg-card border-t border-border flex items-center px-4 justify-between select-none shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-50">
            <div className="flex items-center gap-3">
                <button 
                    onClick={togglePlay} 
                    disabled={!isReady}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg 
                        ${isReady 
                            ? 'bg-primary hover:bg-primary-hover text-black shadow-primary/20' 
                            : 'bg-input text-muted cursor-not-allowed'}`}
                >
                    {!isReady ? (
                        <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                        <FontAwesomeIcon icon={playback.isPlaying ? faPause : faPlay} size="lg" />
                    )}
                </button>
                <div className="flex flex-col ml-2">
                    <span className="text-xs text-muted uppercase font-bold tracking-wider">Time</span>
                    <span className="text-xl font-mono font-medium text-white">{(playback.currentTime / 1000).toFixed(3)}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-6">
                {/* Beat Snap */}
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-muted uppercase font-bold mb-1">Beat Snap</span>
                    <div className="flex items-center bg-input rounded-full px-1 py-0.5 border border-border">
                        <select 
                            className="bg-transparent border-none text-sm font-bold text-center w-16 focus:outline-none cursor-pointer text-white" 
                            value={settings.snapDivisor} 
                            onChange={(e) => setSettings(s => ({ ...s, snapDivisor: Number(e.target.value) }))}
                        >
                            {[1, 2, 3, 4, 6, 8, 12, 16].map(v => (<option key={v} value={v}>1/{v}</option>))}
                        </select>
                    </div>
                </div>
                
                {/* Metronome */}
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-muted uppercase font-bold mb-1">Metronome</span>
                    <button 
                        onClick={() => setSettings(s => ({ ...s, metronome: !s.metronome }))}
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${settings.metronome ? 'bg-primary text-black' : 'bg-input text-muted hover:text-white'}`}
                    >
                        <FontAwesomeIcon icon={settings.metronome ? faVolumeUp : faVolumeMute} />
                    </button>
                </div>

                {/* Playback Rate */}
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-muted uppercase font-bold mb-1">Playback Rate</span>
                    <div className="flex gap-1">
                        {[0.5, 0.75, 1.0].map(rate => (
                            <button 
                                key={rate} 
                                onClick={() => setSettings(s => ({ ...s, playbackSpeed: rate }))} 
                                className={`px-2 py-0.5 text-xs rounded font-bold transition-colors ${settings.playbackSpeed === rate ? 'bg-secondary text-black' : 'bg-input text-muted hover:text-white'}`}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <button disabled={!canUndo} onClick={() => dispatch({ type: 'UNDO' })} className="w-10 h-10 rounded hover:bg-white/10 flex items-center justify-center text-muted hover:text-white disabled:opacity-30 transition-colors"><FontAwesomeIcon icon={faUndo} /></button>
                <button disabled={!canRedo} onClick={() => dispatch({ type: 'REDO' })} className="w-10 h-10 rounded hover:bg-white/10 flex items-center justify-center text-muted hover:text-white disabled:opacity-30 transition-colors"><FontAwesomeIcon icon={faRedo} /></button>
            </div>
        </div>
    );
};