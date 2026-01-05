import { useState, useEffect, useRef } from 'react';
import { useEditor } from '../store/EditorContext';
import { HitsoundSettings, LoopSettings } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faGripVertical } from '@fortawesome/free-solid-svg-icons';

// --- INITIAL STATES ---

const INITIAL_HS: HitsoundSettings = {
    sampleSet: 'normal',
    volume: 100,
    additions: { whistle: false, finish: false, clap: false }
};

const INITIAL_LOOP: LoopSettings = {
    sampleSet: 'normal',
    volume: 100
};

interface HitsoundPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HitsoundPanel = ({ isOpen, onClose }: HitsoundPanelProps) => {
    const { mapData, dispatch } = useEditor();
    
    // --- DRAG LOGIC ---
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        
        // Disable text selection during drag
        document.body.style.userSelect = 'none';
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        setPosition({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y
        });
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    // --- SELECTION LOGIC ---

    const selectedNotes = mapData.notes.filter(n => n.selected);
    const count = selectedNotes.length;
    // We treat it as a "Hold" edit if ALL selected notes are holds. 
    // Mixed selection usually defaults to Tap logic or batch head editing.
    const isHoldMode = count > 0 && selectedNotes.every(n => n.type === 'hold');

    // --- FORM STATE ---

    const [headForm, setHeadForm] = useState<HitsoundSettings>(INITIAL_HS);
    const [tailForm, setTailForm] = useState<HitsoundSettings>(INITIAL_HS);
    const [loopForm, setLoopForm] = useState<LoopSettings>(INITIAL_LOOP);

    // Sync form with selection
    useEffect(() => {
        if (count > 0) {
            const baseNote = selectedNotes[0];
            
            // 1. Head (Always exists)
            setHeadForm({ ...INITIAL_HS, ...baseNote.hitsound });

            // 2. Loop & Tail (Use existing or fallback to Head settings for continuity)
            if (baseNote.type === 'hold') {
                setTailForm(baseNote.holdTailHitsound || { ...INITIAL_HS, ...baseNote.hitsound });
                setLoopForm(baseNote.holdLoopHitsound || { 
                    sampleSet: baseNote.hitsound.sampleSet, 
                    volume: baseNote.hitsound.volume 
                });
            }
        }
    }, [count, selectedNotes[0]?.id]); 

    if (!isOpen || count === 0) return null;

    // --- UPDATE HANDLERS ---

    const applyHead = (newSettings: HitsoundSettings) => {
        setHeadForm(newSettings);
        selectedNotes.forEach(note => {
            dispatch({
                type: 'UPDATE_NOTE',
                payload: { id: note.id, changes: { hitsound: newSettings } }
            });
        });
    };

    const applyTail = (newSettings: HitsoundSettings) => {
        setTailForm(newSettings);
        selectedNotes.forEach(note => {
            if (note.type === 'hold') {
                dispatch({
                    type: 'UPDATE_NOTE',
                    payload: { id: note.id, changes: { holdTailHitsound: newSettings } }
                });
            }
        });
    };

    const applyLoop = (newSettings: LoopSettings) => {
        setLoopForm(newSettings);
        selectedNotes.forEach(note => {
            if (note.type === 'hold') {
                dispatch({
                    type: 'UPDATE_NOTE',
                    payload: { id: note.id, changes: { holdLoopHitsound: newSettings } }
                });
            }
        });
    };

    // --- UI HELPERS ---

    const updateHSField = (
        current: HitsoundSettings, 
        setter: (s: HitsoundSettings) => void, 
        field: keyof HitsoundSettings, 
        value: any
    ) => {
        setter({ ...current, [field]: value });
    };

    const toggleHSAddition = (
        current: HitsoundSettings, 
        setter: (s: HitsoundSettings) => void, 
        key: keyof HitsoundSettings['additions']
    ) => {
        setter({
            ...current,
            additions: { ...current.additions, [key]: !current.additions[key] }
        });
    };

    // --- SUB-COMPONENTS ---

    const SampleSetSelect = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
        <select 
            value={value}
            onChange={(e) => onChange(e.target.value as any)}
            className="appearance-none bg-black border border-white/20 rounded px-2 py-1 text-[10px] font-bold text-white focus:outline-none focus:border-primary w-full cursor-pointer"
        >
            <option value="normal">Normal</option>
            <option value="soft">Soft</option>
            <option value="drum">Drum</option>
        </select>
    );

    const VolumeControl = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between text-[10px] font-bold text-muted uppercase tracking-wider">
                <span>Vol</span>
                <span className="text-primary">{value}%</span>
            </div>
            <input 
                type="range" 
                min="5" max="100" 
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover"
                onMouseDown={(e) => e.stopPropagation()} // Prevent drag conflict
            />
        </div>
    );

    const ToggleButton = ({ label, active, onClick, color = 'secondary' }: { label: string, active: boolean, onClick: () => void, color?: string }) => (
        <button
            onClick={onClick}
            className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase border transition-all ${
                active 
                ? `bg-${color}/20 border-${color} text-${color} shadow-[0_0_8px_rgba(255,255,255,0.1)]` 
                : 'bg-white/5 border-white/10 text-muted hover:border-white/30 hover:text-white'
            }`}
        >
            {label}
        </button>
    );

    // --- SECTIONS ---

    const renderHitsoundSection = (
        title: string, 
        data: HitsoundSettings, 
        setter: (s: HitsoundSettings) => void,
        colorClass: string
    ) => (
        <div className="flex flex-col gap-3 min-w-[140px]">
            <div className={`text-xs font-bold ${colorClass} border-b border-white/10 pb-1 flex justify-between items-center`}>
                <span>{title}</span>
            </div>
            
            {/* Set Selection (Per section now, if desired, or we can keep global if that's the UX) */}
            {/* The prompt implies separate settings, so we allow separate sample sets per section */}
            <SampleSetSelect 
                value={data.sampleSet} 
                onChange={(v) => updateHSField(data, setter, 'sampleSet', v)} 
            />

            <VolumeControl 
                value={data.volume} 
                onChange={(v) => updateHSField(data, setter, 'volume', v)} 
            />

            <div className="flex gap-1">
                <ToggleButton 
                    label="W" 
                    active={data.additions.whistle} 
                    onClick={() => toggleHSAddition(data, setter, 'whistle')} 
                />
                <ToggleButton 
                    label="F" 
                    active={data.additions.finish} 
                    onClick={() => toggleHSAddition(data, setter, 'finish')} 
                />
                <ToggleButton 
                    label="C" 
                    active={data.additions.clap} 
                    onClick={() => toggleHSAddition(data, setter, 'clap')} 
                />
            </div>
        </div>
    );

    const renderLoopSection = () => (
        <div className="flex flex-col gap-3 min-w-[140px]">
             <div className="text-xs font-bold text-secondary border-b border-white/10 pb-1">
                Hold Loop
            </div>
            
            <SampleSetSelect 
                value={loopForm.sampleSet} 
                onChange={(v) => applyLoop({ ...loopForm, sampleSet: v as any })} 
            />

            <VolumeControl 
                value={loopForm.volume} 
                onChange={(v) => applyLoop({ ...loopForm, volume: v })} 
            />

            {/* Loop usually doesn't have additions, just base sound */}
            <div className="h-[26px] flex items-center justify-center border border-white/5 bg-white/5 rounded">
                <span className="text-[9px] text-muted italic">Whistle/Clap N/A</span>
            </div>
        </div>
    );

    return (
        <div 
            className="absolute z-[60] animate-in fade-in zoom-in-95 duration-200"
            style={{ 
                top: '20%', 
                left: '50%', 
                transform: `translate(-50%, 0) translate(${position.x}px, ${position.y}px)`
            }}
        >
            <div className="bg-[#0f111a] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-auto min-w-[400px]">
                {/* Draggable Header */}
                <div 
                    className="px-4 py-2 bg-white/5 border-b border-white/10 flex justify-between items-center cursor-move active:bg-white/10 transition-colors"
                    onMouseDown={handleMouseDown}
                >
                    <div className="flex items-center gap-2 pointer-events-none">
                        <FontAwesomeIcon icon={faGripVertical} className="text-white/20" />
                        <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                Hitsound Settings
                            </h3>
                            <p className="text-[10px] text-muted font-medium leading-none">
                                {count} {isHoldMode ? 'Hold' : 'Tap'} Note{count > 1 ? 's' : ''} Selected
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-white transition-colors p-1" onMouseDown={e => e.stopPropagation()}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4">
                    {isHoldMode ? (
                        <div className="flex gap-4 divide-x divide-white/10">
                            <div className="pl-0">
                                {renderHitsoundSection("Start", headForm, applyHead, "text-primary")}
                            </div>
                            <div className="pl-4">
                                {renderLoopSection()}
                            </div>
                            <div className="pl-4">
                                {renderHitsoundSection("End", tailForm, applyTail, "text-danger")}
                            </div>
                        </div>
                    ) : (
                        // Standard Tap View
                        <div className="w-[200px]">
                             {renderHitsoundSection("Tap", headForm, applyHead, "text-primary")}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};