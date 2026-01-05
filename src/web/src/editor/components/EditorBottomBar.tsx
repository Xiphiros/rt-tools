import { useState } from 'react';
import { useEditor } from '../store/EditorContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlay, faPause, faUndo, faRedo, faVolumeUp, faVolumeMute, faSpinner, faAngleDown, faMusic, faDrum
} from '@fortawesome/free-solid-svg-icons';

const VolumeSlider = ({ 
    label, 
    value, 
    onChange, 
    icon 
}: { 
    label: string, 
    value: number, 
    onChange: (val: number) => void,
    icon: any 
}) => (
    <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between text-[10px] uppercase font-bold text-muted tracking-wider">
            <span className="flex items-center gap-2"><FontAwesomeIcon icon={icon} /> {label}</span>
            <span>{value}%</span>
        </div>
        <input 
            type="range" 
            min="0" max="100" 
            value={value} 
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover"
        />
    </div>
);

export const EditorBottomBar = () => {
    const { playback, audio, canUndo, canRedo, dispatch, settings, setSettings } = useEditor();
    const [showVolume, setShowVolume] = useState(false);
    
    // Check if buffer is ready
    const isReady = !!audio.manager.getBuffer();

    const togglePlay = () => { 
        if (!isReady) return;
        playback.isPlaying ? audio.pause() : audio.play(); 
    };

    return (
        <div className="h-16 bg-card border-t border-border flex items-center px-4 justify-between select-none shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-50 relative">
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
                
                {/* Volume Mixer Toggle */}
                <div className="flex flex-col items-center relative">
                    <span className="text-[10px] text-muted uppercase font-bold mb-1">Volume</span>
                    <button 
                        onClick={() => setShowVolume(!showVolume)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all border ${showVolume ? 'bg-card border-primary text-primary' : 'bg-input text-muted border-border hover:text-white hover:border-white/20'}`}
                    >
                        <FontAwesomeIcon icon={settings.masterVolume === 0 ? faVolumeMute : faVolumeUp} />
                    </button>

                    {/* Mixer Popover */}
                    {showVolume && (
                        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-64 bg-card border border-border rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 z-50 flex flex-col gap-4">
                            <div className="flex justify-between items-center border-b border-border pb-2 mb-1">
                                <span className="text-xs font-bold text-white">Audio Mixer</span>
                                <button onClick={() => setShowVolume(false)} className="text-[10px] bg-input px-2 py-0.5 rounded text-muted hover:text-white">Close</button>
                            </div>
                            
                            <VolumeSlider 
                                label="Master" 
                                value={settings.masterVolume} 
                                onChange={(v) => setSettings(s => ({...s, masterVolume: v}))} 
                                icon={faVolumeUp} 
                            />
                            <VolumeSlider 
                                label="Music" 
                                value={settings.musicVolume} 
                                onChange={(v) => setSettings(s => ({...s, musicVolume: v}))} 
                                icon={faMusic} 
                            />
                            <VolumeSlider 
                                label="Hitsounds" 
                                value={settings.hitsoundVolume} 
                                onChange={(v) => setSettings(s => ({...s, hitsoundVolume: v}))} 
                                icon={faDrum} 
                            />
                            <VolumeSlider 
                                label="Metronome" 
                                value={settings.metronomeVolume} 
                                onChange={(v) => setSettings(s => ({...s, metronomeVolume: v}))} 
                                icon={faDrum} // Reusing drum for metro tick
                            />
                            
                            <button 
                                onClick={() => setSettings(s => ({...s, metronome: !s.metronome}))}
                                className={`mt-2 w-full py-2 rounded text-xs font-bold transition-colors ${settings.metronome ? 'bg-primary text-black' : 'bg-input text-muted hover:text-white'}`}
                            >
                                Metronome: {settings.metronome ? "ON" : "OFF"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Playback Rate */}
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-muted uppercase font-bold mb-1">Rate</span>
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
            
            {/* Backdrop for closing volume mixer */}
            {showVolume && (
                <div className="fixed inset-0 z-40" onClick={() => setShowVolume(false)} />
            )}
        </div>
    );
};