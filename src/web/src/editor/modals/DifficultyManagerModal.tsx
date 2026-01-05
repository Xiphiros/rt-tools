import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useEditor } from '../store/EditorContext';
import { DifficultySummary } from '../types';
import { listDifficulties, deleteDifficulty } from '../utils/opfs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, faTrash, faSpinner, faCheck, faPlay
} from '@fortawesome/free-solid-svg-icons';

interface DifficultyManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DifficultyManagerModal = ({ isOpen, onClose }: DifficultyManagerModalProps) => {
    const { mapData, activeProjectId, switchDifficulty, createNewDifficulty } = useEditor();
    const [diffs, setDiffs] = useState<DifficultySummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    // New Diff Form
    const [newDiffName, setNewDiffName] = useState('');
    const [copySettings, setCopySettings] = useState(true);

    const refreshList = async () => {
        if (!activeProjectId) return;
        setLoading(true);
        const list = await listDifficulties(activeProjectId);
        setDiffs(list);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            setIsCreating(false);
            refreshList();
        }
    }, [isOpen, activeProjectId]);

    const handleSwitch = async (id: string) => {
        await switchDifficulty(id);
        onClose();
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeProjectId) return;
        
        if (diffs.length <= 1) {
            alert("Cannot delete the only difficulty.");
            return;
        }

        if (confirm("Delete this difficulty permanently?")) {
            await deleteDifficulty(activeProjectId, id);
            await refreshList();
            // If we deleted the active one, switch to another
            if (id === mapData.diffId) {
                const remaining = await listDifficulties(activeProjectId);
                if (remaining.length > 0) {
                    await switchDifficulty(remaining[0].id);
                }
            }
        }
    };

    const handleCreate = async () => {
        if (!newDiffName.trim()) return;
        await createNewDifficulty(newDiffName, copySettings);
        await refreshList();
        setIsCreating(false);
        setNewDiffName('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Difficulty Manager">
            <div className="flex flex-col h-[400px]">
                
                {/* Creation Form */}
                {isCreating ? (
                    <div className="bg-input/30 p-4 rounded-lg border border-primary/30 mb-4 animate-in fade-in slide-in-from-top-2">
                        <h4 className="text-sm font-bold text-white mb-3">Create New Difficulty</h4>
                        <div className="flex flex-col gap-3">
                            <input 
                                type="text" 
                                placeholder="Difficulty Name (e.g. Hard)" 
                                className="bg-input border border-border rounded px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                value={newDiffName}
                                onChange={(e) => setNewDiffName(e.target.value)}
                                autoFocus
                            />
                            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={copySettings} 
                                    onChange={(e) => setCopySettings(e.target.checked)}
                                    className="accent-primary"
                                />
                                Copy Timing & Metadata from current difficulty
                            </label>
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setIsCreating(false)} className="px-3 py-1.5 rounded text-xs font-bold text-muted hover:text-white">Cancel</button>
                                <button onClick={handleCreate} className="px-3 py-1.5 bg-primary text-black rounded text-xs font-bold hover:bg-primary-hover">Create</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-end mb-4">
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="px-3 py-1.5 bg-success/20 text-success hover:bg-success/30 rounded border border-success/50 text-sm font-bold flex items-center gap-2 transition-all"
                        >
                            <FontAwesomeIcon icon={faPlus} /> New Difficulty
                        </button>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 bg-input/30 rounded-lg border border-border overflow-hidden flex flex-col">
                    <div className="grid grid-cols-12 gap-2 p-3 bg-input border-b border-border text-xs font-bold text-muted uppercase tracking-wider">
                        <div className="col-span-8">Difficulty Name</div>
                        <div className="col-span-4 text-right">Actions</div>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-muted">
                                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Loading...
                            </div>
                        ) : diffs.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted text-sm">
                                No difficulties found.
                            </div>
                        ) : (
                            diffs.map(diff => (
                                <div 
                                    key={diff.id}
                                    className={`grid grid-cols-12 gap-2 p-3 border-b border-border/50 items-center text-sm cursor-pointer hover:bg-white/5 transition-colors ${diff.id === mapData.diffId ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
                                    onClick={() => handleSwitch(diff.id)}
                                >
                                    <div className="col-span-8 font-semibold text-white truncate flex items-center gap-2">
                                        {diff.id === mapData.diffId && <FontAwesomeIcon icon={faCheck} className="text-primary text-xs" />}
                                        {diff.name}
                                    </div>
                                    <div className="col-span-4 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleSwitch(diff.id); }}
                                            className="p-2 text-muted hover:text-white transition-colors"
                                            title="Load"
                                        >
                                            <FontAwesomeIcon icon={faPlay} size="xs" />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(diff.id, e)}
                                            className="p-2 text-danger hover:text-danger-light transition-colors disabled:opacity-30"
                                            title="Delete"
                                            disabled={diffs.length <= 1}
                                        >
                                            <FontAwesomeIcon icon={faTrash} size="xs" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                
                <div className="mt-2 text-center text-xs text-muted">
                    Project ID: {activeProjectId || "Unsaved"}
                </div>
            </div>
        </Modal>
    );
};