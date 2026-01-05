import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEditor } from '../store/EditorContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlay, faPause, faUndo, faRedo, faSliders, faSpinner, faAngleDown, faMusic, faDrum, faClock, faVolumeUp
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
            <span className="flex items-center gap-2"><FontAwesomeIcon icon={icon} className="w-3" /> {label}</span>
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
    const volumeBtnRef = useRef<HTMLButtonElement>(null);
    const [popupPosition, setPopupPosition] = useState({ left: 0, bottom: 0 });
    
    // Check if buffer is ready
    const isReady = !!audio.manager.getBuffer();

    const togglePlay = () => { 
        if (!isReady) return;
        playback.isPlaying ? audio.pause() : audio.play(); 
    };

    // Calculate position for the portal
    useEffect(() => {
        if (showVolume && volumeBtnRef.current) {
            const rect = volumeBtnRef.current.getBoundingClientRect();
            setPopupPosition({
                left: rect.left + rect.width / 2,
                bottom: window.innerHeight - rect.top + 10
            });
        }
    }, [showVolume]);

    return (
        <div className="h-16 bg-card border-t border-border flex items-center px-4 justify-between select-none shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-50 relative">
            <div className="flex items-center gap-3 w-48">
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
            
            {/* Center Controls */}
            <div className="flex items-center gap-8 justify-center flex-1">
                {/* Beat Snap */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Snap</span>
                    <div className="relative group">
                        <select 
                            className="appearance-none bg-input border border-border hover:border-primary/50 text-white font-bold text-center pl-3 pr-7 py-1 rounded focus:outline-none focus:border-primary transition-all cursor-pointer text-xs w-20"
                            value={settings.snapDivisor} 
                            onChange={(e) => setSettings(s => ({ ...s, snapDivisor: Number(e.target.value) }))}
                        >
                            {[1, 2, 3, 4, 6, 8, 12, 16].map(v => (<option key={v} value={v}>1/{v}</option>))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted group-hover:text-primary transition-colors">
                            <FontAwesomeIcon icon={faAngleDown} size="xs" />
                        </div>
                    </div>
                </div>
                
                {/* Metronome */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Metro</span>
                    <button 
                        onClick={() => setSettings(s => ({ ...s, metronome: !s.metronome }))}
                        className={`w-16 py-1 rounded text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                            settings.metronome 
                            ? 'bg-secondary/20 text-secondary border-secondary shadow-[0_0_10px_rgba(168,85,247,0.2)]' 
                            : 'bg-input text-muted border-border hover:text-white hover:border-white/20'
                        }`}
                    >
                        <FontAwesomeIcon icon={faClock} />
                        {settings.metronome ? "ON" : "OFF"}
                    </button>
                </div>

                {/* Volume Mixer Toggle */}
                <div className="flex flex-col items-center gap-1 relative">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Mixer</span>
                    <button 
                        ref={volumeBtnRef}
                        onClick={() => setShowVolume(!showVolume)}
                        className={`w-16 py-1 rounded text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                            showVolume 
                            ? 'bg-primary/20 text-primary border-primary shadow-[0_0_10px_rgba(34,211,238,0.2)]' 
                            : 'bg-input text-muted border-border hover:text-white hover:border-white/20'
                        }`}
                    >
                        <FontAwesomeIcon icon={faSliders} />
                        VOL
                    </button>

                    {/* Mixer Popover (PORTAL) */}
                    {showVolume && createPortal(
                        <>
                            <div className="fixed inset-0 z-[60]" onClick={() => setShowVolume(false)} />
                            <div 
                                className="fixed w-64 bg-card border border-border rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 z-[70] flex flex-col gap-4"
                                style={{
                                    left: popupPosition.left,
                                    bottom: popupPosition.bottom,
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                <div className="flex justify-between items-center border-b border-border pb-2 mb-1">
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Audio Mixer</span>
                                    <button onClick={() => setShowVolume(false)} className="text-[10px] bg-input px-2 py-0.5 rounded text-muted hover:text-white">✕</button>
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
                                    icon={faClock} 
                                />
                            </div>
                        </>,
                        document.body
                    )}
                </div>

                {/* Playback Rate */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Rate</span>
                    <div className="flex gap-0.5 bg-input p-0.5 rounded border border-border">
                        {[0.5, 0.75, 1.0].map(rate => (
                            <button 
                                key={rate} 
                                onClick={() => setSettings(s => ({ ...s, playbackSpeed: rate }))} 
                                className={`px-2 py-0.5 text-[10px] rounded font-bold transition-all ${
                                    settings.playbackSpeed === rate 
                                    ? 'bg-white/10 text-white shadow-sm' 
                                    : 'text-muted hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 w-48 justify-end">
                <button disabled={!canUndo} onClick={() => dispatch({ type: 'UNDO' })} className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted hover:text-white disabled:opacity-30 transition-colors"><FontAwesomeIcon icon={faUndo} /></button>
                <button disabled={!canRedo} onClick={() => dispatch({ type: 'REDO' })} className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted hover:text-white disabled:opacity-30 transition-colors"><FontAwesomeIcon icon={faRedo} /></button>
            </div>
        </div>
    );
};