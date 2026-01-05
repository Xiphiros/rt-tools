import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useEditor } from '../store/EditorContext';
import { HitsoundSettings } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeUp, faCheck } from '@fortawesome/free-solid-svg-icons';

interface NotePropertiesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Initial state for mixed selection
const INITIAL_STATE: HitsoundSettings = {
    sampleSet: 'normal',
    volume: 100,
    additions: { whistle: false, finish: false, clap: false }
};

export const NotePropertiesModal = ({ isOpen, onClose }: NotePropertiesModalProps) => {
    const { mapData, dispatch } = useEditor();
    const selectedNotes = mapData.notes.filter(n => n.selected);
    const count = selectedNotes.length;

    const [form, setForm] = useState<HitsoundSettings>(INITIAL_STATE);

    // Load common properties on open
    useEffect(() => {
        if (isOpen && count > 0) {
            // Take the first note as base
            const base = selectedNotes[0].hitsound || INITIAL_STATE;
            setForm({
                sampleSet: base.sampleSet,
                volume: base.volume,
                additions: { ...base.additions }
            });
        }
    }, [isOpen, count]); // Dependencies updated

    const updateField = (key: keyof HitsoundSettings, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const toggleAddition = (key: keyof HitsoundSettings['additions']) => {
        setForm(prev => ({
            ...prev,
            additions: { ...prev.additions, [key]: !prev.additions[key] }
        }));
    };

    const handleApply = () => {
        // Batch update selected notes
        selectedNotes.forEach(note => {
            dispatch({
                type: 'UPDATE_NOTE',
                payload: {
                    id: note.id,
                    changes: {
                        hitsound: {
                            ...form,
                            additions: { ...form.additions }
                        }
                    }
                }
            });
        });
        onClose();
    };

    if (count === 0) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Notes (${count} selected)`}>
            <div className="space-y-6">
                {/* Sample Set */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">Sample Set</label>
                    <div className="flex gap-2">
                        {['normal', 'soft', 'drum'].map(set => (
                            <button
                                key={set}
                                onClick={() => updateField('sampleSet', set)}
                                className={`flex-1 py-2 rounded border transition-all font-bold text-sm uppercase ${
                                    form.sampleSet === set 
                                    ? 'bg-primary text-black border-primary' 
                                    : 'bg-input border-border text-muted hover:text-white'
                                }`}
                            >
                                {set}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Additions */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">Additions</label>
                    <div className="flex gap-2">
                        {['whistle', 'finish', 'clap'].map(type => {
                            const key = type as keyof HitsoundSettings['additions'];
                            const isActive = form.additions[key];
                            return (
                                <button
                                    key={type}
                                    onClick={() => toggleAddition(key)}
                                    className={`flex-1 py-2 rounded border transition-all font-bold text-sm uppercase flex items-center justify-center gap-2 ${
                                        isActive
                                        ? 'bg-secondary text-white border-secondary' 
                                        : 'bg-input border-border text-muted hover:text-white'
                                    }`}
                                >
                                    {isActive && <FontAwesomeIcon icon={faCheck} />}
                                    {type}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Volume */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider flex justify-between">
                        <span>Volume</span>
                        <span className="text-white">{form.volume}%</span>
                    </label>
                    <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faVolumeUp} className="text-muted" />
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={form.volume}
                            onChange={(e) => updateField('volume', Number(e.target.value))}
                            className="w-full accent-primary h-2 bg-input rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded text-muted hover:text-white transition-colors">Cancel</button>
                    <button 
                        onClick={handleApply} 
                        className="px-6 py-2 bg-success text-white font-bold rounded shadow-lg shadow-success/20 transition-all hover:bg-success-hover"
                    >
                        Apply to Selection
                    </button>
                </div>
            </div>
        </Modal>
    );
};