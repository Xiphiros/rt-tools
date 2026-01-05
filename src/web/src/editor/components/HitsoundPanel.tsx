import { useState, useEffect } from 'react';
import { useEditor } from '../store/EditorContext';
import { HitsoundSettings } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faMusic } from '@fortawesome/free-solid-svg-icons';

// Initial state for mixed selection
const INITIAL_STATE: HitsoundSettings = {
    sampleSet: 'normal',
    volume: 100,
    additions: { whistle: false, finish: false, clap: false }
};

interface HitsoundPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HitsoundPanel = ({ isOpen, onClose }: HitsoundPanelProps) => {
    const { mapData, dispatch } = useEditor();
    
    // Get selection
    const selectedNotes = mapData.notes.filter(n => n.selected);
    const count = selectedNotes.length;
    const isHold = count === 1 && selectedNotes[0].type === 'hold';
    
    // Internal form state
    const [form, setForm] = useState<HitsoundSettings>(INITIAL_STATE);

    // Sync form with selection
    useEffect(() => {
        if (count > 0) {
            // Use the first note's settings as the baseline
            const base = selectedNotes[0].hitsound || INITIAL_STATE;
            setForm({
                sampleSet: base.sampleSet,
                volume: base.volume,
                additions: { ...base.additions }
            });
        }
    }, [count, selectedNotes[0]?.id]); // Update when selection changes

    if (!isOpen || count === 0) return null;

    // --- Actions ---

    const applyUpdate = (newState: HitsoundSettings) => {
        setForm(newState);
        
        // Immediate apply (Live Edit)
        selectedNotes.forEach(note => {
            dispatch({
                type: 'UPDATE_NOTE',
                payload: {
                    id: note.id,
                    changes: {
                        hitsound: { ...newState, additions: { ...newState.additions } }
                    }
                }
            });
        });
    };

    const updateField = (key: keyof HitsoundSettings, value: any) => {
        applyUpdate({ ...form, [key]: value });
    };

    const toggleAddition = (key: keyof HitsoundSettings['additions']) => {
        const newAdditions = { ...form.additions, [key]: !form.additions[key] };
        applyUpdate({ ...form, additions: newAdditions });
    };

    // --- UI Components ---

    const SampleSetSelect = () => (
        <div className="relative">
            <select 
                value={form.sampleSet}
                onChange={(e) => updateField('sampleSet', e.target.value)}
                className="appearance-none bg-black border border-white/20 rounded px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-primary w-28 cursor-pointer"
            >
                <option value="normal">Normal</option>
                <option value="soft">Soft</option>
                <option value="drum">Drum</option>
            </select>
        </div>
    );

    const VolumeControl = ({ label }: { label?: string }) => (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between text-[10px] font-bold text-muted uppercase tracking-wider">
                <span>{label || 'Volume'}</span>
                <span className="text-primary">{form.volume}%</span>
            </div>
            <input 
                type="range" 
                min="5" max="100" 
                value={form.volume}
                onChange={(e) => updateField('volume', Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover"
            />
        </div>
    );

    const ToggleButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase border transition-all ${
                active 
                ? 'bg-secondary/20 border-secondary text-secondary shadow-[0_0_10px_rgba(192,132,252,0.2)]' 
                : 'bg-white/5 border-white/10 text-muted hover:border-white/30 hover:text-white'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="bg-[#0f111a] border border-white/10 rounded-xl shadow-2xl w-[500px] overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <FontAwesomeIcon icon={faMusic} className="text-primary" />
                            Hitsound Settings
                        </h3>
                        <p className="text-[10px] text-muted font-medium">
                            Editing {count} selected note{count > 1 ? 's' : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-white transition-colors">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-6">
                    {/* Top Row: SampleSet */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-muted uppercase">Sample Set</span>
                            <SampleSetSelect />
                        </div>
                    </div>

                    {isHold ? (
                        // Hold Note Layout (3 Columns)
                        <div className="grid grid-cols-3 gap-6">
                            {/* Start */}
                            <div className="space-y-3">
                                <span className="text-xs font-bold text-white border-b border-white/10 pb-1 block">Start</span>
                                <VolumeControl label="Volume" />
                                <div className="flex flex-wrap gap-2">
                                    <ToggleButton label="N" active={true} onClick={() => {}} /> {/* Normal always on for tap */}
                                    <ToggleButton label="W" active={form.additions.whistle} onClick={() => toggleAddition('whistle')} />
                                    <ToggleButton label="F" active={form.additions.finish} onClick={() => toggleAddition('finish')} />
                                    <ToggleButton label="C" active={form.additions.clap} onClick={() => toggleAddition('clap')} />
                                </div>
                            </div>

                            {/* Loop */}
                            <div className="space-y-3 opacity-50 pointer-events-none grayscale" title="Linked to Start (Current Limitation)">
                                <span className="text-xs font-bold text-white border-b border-white/10 pb-1 block">Hold Loop</span>
                                <VolumeControl label="Volume" />
                                <div className="text-[10px] text-muted italic pt-2">Inherits Settings</div>
                            </div>

                            {/* End */}
                            <div className="space-y-3 opacity-50 pointer-events-none grayscale" title="Linked to Start (Current Limitation)">
                                <span className="text-xs font-bold text-white border-b border-white/10 pb-1 block">End</span>
                                <VolumeControl label="Volume" />
                                <div className="text-[10px] text-muted italic pt-2">Inherits Settings</div>
                            </div>
                        </div>
                    ) : (
                        // Tap Note Layout (Standard)
                        <div className="space-y-4">
                            <VolumeControl />
                            
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-muted uppercase tracking-wider block">Hitsounds</span>
                                <div className="flex gap-2">
                                    <button className="flex-1 py-2 bg-primary/20 border border-primary text-primary text-xs font-bold rounded uppercase cursor-default">
                                        Normal
                                    </button>
                                    <button 
                                        onClick={() => toggleAddition('clap')}
                                        className={`flex-1 py-2 border rounded text-xs font-bold uppercase transition-all ${form.additions.clap ? 'bg-secondary text-white border-secondary' : 'bg-white/5 border-white/10 text-muted hover:border-white/30'}`}
                                    >
                                        Clap
                                    </button>
                                    <button 
                                        onClick={() => toggleAddition('whistle')}
                                        className={`flex-1 py-2 border rounded text-xs font-bold uppercase transition-all ${form.additions.whistle ? 'bg-secondary text-white border-secondary' : 'bg-white/5 border-white/10 text-muted hover:border-white/30'}`}
                                    >
                                        Whistle
                                    </button>
                                    <button 
                                        onClick={() => toggleAddition('finish')}
                                        className={`flex-1 py-2 border rounded text-xs font-bold uppercase transition-all ${form.additions.finish ? 'bg-secondary text-white border-secondary' : 'bg-white/5 border-white/10 text-muted hover:border-white/30'}`}
                                    >
                                        Finish
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};