import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEditor } from '../store/EditorContext';
import { HitsoundSettings } from '../types';
import { COMMON_SNAPS } from '../utils/snapColors';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlay, 
    faPause, 
    faUndo, 
    faRedo, 
    faSliders, 
    faSpinner, 
    faAngleDown, 
    faMusic, 
    faDrum, 
    faClock, 
    faVolumeUp,
    faBullseye
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

// Generic Popover Wrapper
const Popover = ({ 
    isOpen, 
    onClose, 
    title, 
    anchorRef, 
    children 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    title: string, 
    anchorRef: React.RefObject<HTMLElement>, 
    children: React.ReactNode 
}) => {
    const [position, setPosition] = useState({ left: 0, bottom: 0 });

    useLayoutEffect(() => {
        if (isOpen && anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPosition({
                left: rect.left + rect.width / 2,
                bottom: window.innerHeight - rect.top + 10
            });
        }
    }, [isOpen, anchorRef]);

    if (!isOpen) return null;

    return createPortal(
        <div className="relative z-[9999]">
            <div className="fixed inset-0 bg-transparent" onClick={onClose} />
            <div 
                className="fixed bg-card border border-border rounded-xl shadow-2xl p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-100"
                style={{
                    left: position.left,
                    bottom: position.bottom,
                    transform: 'translateX(-50%)',
                    width: '280px'
                }}
            >
                <div className="flex justify-between items-center border-b border-border pb-2 mb-1">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{title}</span>
                    <button onClick={onClose} className="text-[10px] bg-input px-2 py-0.5 rounded text-muted hover:text-white">✕</button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
};

export const EditorBottomBar = () => {
    const { playback, audio, canUndo, canRedo, dispatch, settings, setSettings, defaultHitsounds, setDefaultHitsounds } = useEditor();
    const [showVolume, setShowVolume] = useState(false);
    const [showSamples, setShowSamples] = useState(false);
    
    const volumeBtnRef = useRef<HTMLButtonElement>(null);
    const samplesBtnRef = useRef<HTMLButtonElement>(null);
    
    const isReady = !!audio.manager.getBuffer();

    const togglePlay = () => { 
        if (!isReady) return;
        playback.isPlaying ? audio.pause() : audio.play(); 
    };

    const updateDefaultSample = (key: keyof HitsoundSettings, val: any) => {
        setDefaultHitsounds(prev => ({ ...prev, [key]: val }));
    };

    const toggleAddition = (key: keyof HitsoundSettings['additions']) => {
        setDefaultHitsounds(prev => ({
            ...prev,
            additions: { ...prev.additions, [key]: !prev.additions[key] }
        }));
    };

    return (
        <div className="h-16 bg-card border-t border-border flex items-center px-4 justify-between select-none shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-50 relative">
            {/* Left: Playback Controls */}
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
            
            {/* Center: Tools */}
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
                            {COMMON_SNAPS.map(v => (<option key={v} value={v}>1/{v}</option>))}
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

                {/* Samples Toggle */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Samples</span>
                    <button 
                        ref={samplesBtnRef}
                        onClick={() => setShowSamples(!showSamples)}
                        className={`w-16 py-1 rounded text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                            showSamples
                            ? 'bg-success/20 text-success border-success shadow-[0_0_10px_rgba(52,211,153,0.2)]' 
                            : 'bg-input text-muted border-border hover:text-white hover:border-white/20'
                        }`}
                    >
                        <FontAwesomeIcon icon={faBullseye} />
                        SET
                    </button>
                    
                    <Popover isOpen={showSamples} onClose={() => setShowSamples(false)} title="Default Hitsounds" anchorRef={samplesBtnRef}>
                        <div className="flex flex-col gap-4">
                            {/* Sets */}
                            <div className="flex gap-1 bg-input p-1 rounded-lg">
                                {['normal', 'soft', 'drum'].map(set => (
                                    <button 
                                        key={set}
                                        onClick={() => updateDefaultSample('sampleSet', set)}
                                        className={`flex-1 py-1.5 text-xs font-bold uppercase rounded transition-all ${
                                            defaultHitsounds.sampleSet === set 
                                            ? 'bg-primary text-black shadow-sm' 
                                            : 'text-muted hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {set}
                                    </button>
                                ))}
                            </div>

                            {/* Additions */}
                            <div className="flex gap-2">
                                {['whistle', 'finish', 'clap'].map(add => {
                                    const key = add as keyof typeof defaultHitsounds.additions;
                                    const isActive = defaultHitsounds.additions[key];
                                    return (
                                        <button 
                                            key={add}
                                            onClick={() => toggleAddition(key)}
                                            className={`flex-1 py-2 rounded border text-xs font-bold uppercase transition-all ${
                                                isActive
                                                ? 'bg-secondary text-white border-secondary' 
                                                : 'bg-input border-border text-muted hover:text-white'
                                            }`}
                                        >
                                            {add}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Volume */}
                            <VolumeSlider 
                                label="Sample Volume" 
                                value={defaultHitsounds.volume} 
                                onChange={(v) => updateDefaultSample('volume', v)} 
                                icon={faDrum} 
                            />
                        </div>
                    </Popover>
                </div>

                {/* Volume Mixer Toggle */}
                <div className="flex flex-col items-center gap-1">
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

                    <Popover isOpen={showVolume} onClose={() => setShowVolume(false)} title="Audio Mixer" anchorRef={volumeBtnRef}>
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
                    </Popover>
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